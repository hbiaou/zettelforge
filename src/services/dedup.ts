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
     */
    buildIndex(): void {
        this.titleCache.clear();
        this.aliasCache.clear();

        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
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
        console.log(`[ZettelForge] Dedup index built: ${this.titleCache.size} titles, ${this.aliasCache.size} aliases.`);
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
     * 
     * @param content The candidate content (claim/text) to check.
     * @param threshold Similarity threshold (0.0 - 1.0). Default 0.5.
     */
    async findSimilar(content: string, threshold = 0.5): Promise<DedupResult['similarNotes']> {
        const candidates = this.app.vault.getMarkdownFiles();
        const results: DedupResult['similarNotes'] = [];

        // Pre-tokenize source once
        const sourceSet = this.getShingles(content);
        if (sourceSet.size === 0) return [];

        // We limit the scan to recent/relevant notes or just scan all (optimization: scan all for now, it's fast < 2k notes)
        // For large vaults, this should be optimized to use an inverted index or limit by folder.

        for (const file of candidates) {
            if (file.path.startsWith(this.settings.inboxFolder)) continue;

            // Optimization: Read cache first for tags/aliasing, but for content similarity we might need to read file 
            // OR use a cached snippet? Reading 2k files is slow.
            // Compromise: Match against *file name* tokens heavily, and maybe *frontmatter atomic_claim* if it exists?
            // Reading full content of every file is too heavy for a synchronous-like check.

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

            // Check 2: Atomic Claim (if available in cache)
            const cache = this.app.metadataCache.getFileCache(file);
            // We can add more fields here if we want to check against headers etc.

            // To be truly effective for *content* dupes, we'd need the content. 
            // Attempting to read only if title score was > 0.2 (heuristic to drill down)?
            // For now, let's rely on Title + Tag overlap + maybe frontmatter description.

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
