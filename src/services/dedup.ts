import { App, TFile } from "obsidian";
import { ZettelForgeSettings } from "../config";
import { getFrontmatter } from "../utils/frontmatter";

export interface RelatedNote {
    file: TFile;
    score: number;
}

export class DedupService {
    app: App;
    settings: ZettelForgeSettings;

    constructor(app: App, settings: ZettelForgeSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Scans the vault for potential duplicates or related notes.
     * M1 Heuristic: Matches tags and simple title keywords.
     */
    findRelated(title: string, tags: string[]): RelatedNote[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        const titleTokens = title.toLowerCase().split(/\s+/).filter(t => t.length > 3);

        const candidates: RelatedNote[] = [];

        for (const file of allFiles) {
            if (file.path.startsWith(this.settings.inboxFolder)) continue; // Skip inbox

            let score = 0;
            const fm = getFrontmatter(this.app, file);

            // 1. Tag overlap (high weight)
            if (fm && fm.tags && tags.length > 0) {
                const fileTags = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
                const intersection = tags.filter(t => fileTags.includes(t));
                score += intersection.length * 0.3;
            }

            // 2. Title Keyword overlap (medium weight)
            const fileTitleTokens = file.basename.toLowerCase().split(/\s+/);
            const tokenMatches = titleTokens.filter(t => fileTitleTokens.some(ft => ft.includes(t)));
            score += tokenMatches.length * 0.2;

            if (score > 0.1) {
                candidates.push({ file, score });
            }
        }

        return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
    }
}
