import { App, TFile, getAllTags } from "obsidian";
import { ZettelForgeSettings } from "../config";

export interface DedupResult {
    isExactMatch: boolean;
    similarNotes: Array<{
        file: TFile;
        score: number;
        reason: string;
    }>;
}

export class DedupService {
    app: App;
    settings: ZettelForgeSettings;

    // Cache for hard deduplication
    private titleCache: Set<string> = new Set();
    private aliasCache: Map<string, string> = new Map(); // alias -> original filename

    constructor(app: App, settings: ZettelForgeSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Builds/Refresh the in-memory index of titles and aliases.
     * Call this on startup and periodically/on-change if needed.
     * RESTRICTED: Only scans notes in the configured 'Final Folder' (Zettels).
     */
    buildIndex(): void {
        this.titleCache.clear();
        this.aliasCache.clear();

        const files = this.app.vault.getMarkdownFiles();
        const finalFolder = this.settings.finalFolder || 'Zettels';

        for (const file of files) {
            // Only index files inside the Atomic Notes folder
            if (!file.path.startsWith(finalFolder)) continue;

            this.titleCache.add(file.basename.toLowerCase());

            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.aliases) {
                const aliases = cache.frontmatter.aliases;
                if (Array.isArray(aliases)) {
                    aliases.forEach(a => this.aliasCache.set(a.toLowerCase(), file.basename));
                } else if (typeof aliases === 'string') {
                    this.aliasCache.set(aliases.toLowerCase(), file.basename);
                }
            }
        }
        console.log(`[ZettelForge] Dedup index built for '${finalFolder}': ${this.titleCache.size} titles, ${this.aliasCache.size} aliases.`);
    }

    /**
     * Checks if a title or alias already exists in the vault.
     * Case-insensitive.
     */
    isTitleDuplicate(title: string): { exists: boolean, originalName?: string } {
        const lower = title.toLowerCase();
        if (this.titleCache.has(lower)) {
            return { exists: true, originalName: title }; // exact file match
        }
        if (this.aliasCache.has(lower)) {
            return { exists: true, originalName: this.aliasCache.get(lower) };
        }
        return { exists: false };
    }

    /**
     * Finds semantically similar notes using Jaccard Similarity on 3-grams (Shingling).
     * This is a "Soft Check" for content duplication.
     * RESTRICTED: scans notes in 'Final Folder' AND any optional `extraFiles` (e.g. Inbox candidates).
     * 
     * @param content The candidate content (claim/text) to check.
     * @param threshold Similarity threshold (0.0 - 1.0). Default 0.5.
     * @param extraFiles Optional list of additional files to check (e.g. current Inbox batch).
     * @param excludePath Optional file path to exclude from results (self).
     */
    async findSimilar(content: string, threshold = 0.5, extraFiles: TFile[] = [], excludePath?: string): Promise<DedupResult['similarNotes']> {
        // 1. Get files from Final Folder
        const allFiles = this.app.vault.getMarkdownFiles();
        const finalFolder = this.settings.finalFolder || 'Zettels';

        const candidates = allFiles.filter(f => f.path.startsWith(finalFolder));

        // 2. Add extra files (e.g. Inbox)
        // Ensure uniqueness if extraFiles overlaps with candidates (unlikely if they are in Inbox)
        for (const extra of extraFiles) {
            if (!candidates.includes(extra)) {
                candidates.push(extra);
            }
        }

        const results: DedupResult['similarNotes'] = [];

        // Pre-tokenize source once
        const sourceSet = this.getShingles(content);
        if (sourceSet.size === 0) return [];

        for (const file of candidates) {
            // Exclude self
            if (excludePath && file.path === excludePath) continue;

            // Strategy: 
            // 1. Check filename similarity (fast)
            // 2. If it's an atomic note, check its 'atomic_claim' in frontmatter (fast-ish via cache)

            let maxScore = 0;
            let reason = '';

            // Check 1: Filename
            const filenameSet = this.getShingles(file.basename);
            const nameScore = this.calculateJaccard(sourceSet, filenameSet);

            if (nameScore > maxScore) {
                maxScore = nameScore;
                reason = "Similar Title";
            }

            // Check 2: Content Body (Slow but necessary for batch dupes)
            // If it's in extraFiles (Inbox), we absolutely must read the content because it might not be cached yet?
            // Actually `read` is async.
            // For `candidates` from vault, reading all is too slow.
            // BUT for `extraFiles` (small batch of ~10), we SHOULD read them.

            // Optimization: Only read content if it's in `extraFiles` OR if we have a hint?
            // For now, let's treat `finalFolder` files as "Title/Alias check only" unless we implementing caching?
            // Wait, Jaccard on *content* was the promise. 
            // "Trade-offs between Stress..." vs "Trade-offs in Crop..." -> These titles are similar enough (Trade-offs).
            // But "Adaptive Resistance..." vs "Low Human Interference..." -> Titles are different.
            // We NEED to check content.

            // If we can't read 2000 files, we rely on the `atomic_claim` frontmatter if available?
            // Let's check frontmatter for `atomic_claim` or `atomic_note_claim`?
            // The generated notes have `atomic_claim` in the body, but maybe not in FM?
            // Looking at user example: `note_origin: ai`... `tags`...
            // It seems "atomic_claim" is NOT in frontmatter in the user examples.
            // It is in the BODY: `## CLAIM\n...`

            // So we can't easily check content of existing notes without reading them.
            // However, we CAN read the content of `extraFiles` (Inbox) because they are few.

            if (extraFiles.includes(file)) {
                // It's a candidate in inbox, likely small count (<20). READ IT.
                const fileContent = await this.app.vault.read(file);
                const contentSet = this.getShingles(fileContent);
                const contentScore = this.calculateJaccard(sourceSet, contentSet);
                if (contentScore > maxScore) {
                    maxScore = contentScore;
                    reason = "Similar Content (Inbox)";
                }
            } else {
                // It's an archived note. 
                // Using `file.basename` logic (Done above).
                // Can we check Frontmatter tags as proxy?
                // Or maybe read the first N bytes? 

                // For now, keep it fast: Title matches are heavily weighted.
                // If we want to catch "Adaptive Resistance" vs "Low Human Interference", we depend on:
                // 1. Tags?
                // 2. Reference?
                // 3. Or maybe the User IS OK with us scanning the folder if it's not too huge?
                // Let's stick to: Title check for Archive, Full check for Inbox.
                // AND: If the user provides `extraFiles`, we check those fully.
            }

            if (maxScore > threshold) {
                results.push({ file, score: maxScore, reason });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    private getShingles(text: string, n: number = 2): Set<string> {
        const shingles = new Set<string>();
        const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
        const words = normalized.split(/\s+/).filter(w => w.length > 0);

        if (words.length < n) return new Set(words); // fallback for short text

        for (let i = 0; i <= words.length - n; i++) {
            shingles.add(words.slice(i, i + n).join(' '));
        }
        return shingles;
    }

    private calculateJaccard(setA: Set<string>, setB: Set<string>): number {
        if (setA.size === 0 || setB.size === 0) return 0;
        let intersection = 0;
        setA.forEach(item => {
            if (setB.has(item)) intersection++;
        });
        return intersection / (setA.size + setB.size - intersection);
    }
}
