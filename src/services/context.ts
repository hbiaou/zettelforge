import { App, TFile } from "obsidian";

export interface ContextItem {
    title: string;
    path: string;
    tags: string[];
    // We might want a snippet later, but title/tags are most critical for the graph
}

export class ContextService {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Scans the vault for existing atomic notes.
     * Filters by frontmatter `note_type: 'atomic-note'`.
     */
    async getAtomicNotes(): Promise<ContextItem[]> {
        const atomicNotes: ContextItem[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;

            if (cache.frontmatter.note_type === 'atomic-note') {
                atomicNotes.push({
                    title: file.basename,
                    path: file.path,
                    tags: cache.frontmatter.tags || []
                });
            }
        }

        return atomicNotes;
    }

    /**
     * Finds the most relevant atomic notes given a source text.
     * Uses a simple Jaccard Index strategy on keywords/tags.
     * 
     * @param content The content of the source note (or just a chunk)
     * @param limit Max number of results (default 20)
     */
    async findRelevantNotes(content: string, limit = 20): Promise<ContextItem[]> {
        const atomicNotes = await this.getAtomicNotes();
        if (atomicNotes.length === 0) return [];

        // 1. Extract "features" from source content (simple bag of words)
        // Filter out common stop words approx by length < 4 for speed
        const sourceWords = new Set(
            content.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
        );

        // 2. Score each note
        const scored = atomicNotes.map(note => {
            let score = 0;

            // Score based on Title overlap
            const titleWords = note.title.toLowerCase().split(/\s+/);
            const titleOverlap = titleWords.filter(w => sourceWords.has(w)).length;
            score += titleOverlap * 2; // Title matches are high value

            // Score based on Tags (if source content contains the tag text)
            // Ideally we'd compare source tags vs destination tags, but source might not be tagged yet.
            // So we see if the *content* mentions the tag.
            if (note.tags) {
                const tagsOverlap = note.tags.filter(t => sourceWords.has(t.toLowerCase())).length;
                score += tagsOverlap * 1;
            }

            return { note, score };
        });

        // 3. Sort and slice
        scored.sort((a, b) => b.score - a.score);

        // Return only those with at least some relevance (score > 0)
        return scored
            .filter(item => item.score > 0)
            .slice(0, limit)
            .map(item => item.note);
    }
}
