import { App, TFile, FileManager } from "obsidian";

/**
 * Safely updates the frontmatter of a note using Obsidian's processFrontMatter API.
 * This ensures atomic updates and preserves existing formatting/comments.
 * 
 * @param app - The Obsidian App instance
 * @param file - The TFile to update
 * @param updateFn - A callback that receives the current frontmatter object and modifies it
 */
export async function updateFrontmatter(
    app: App,
    file: TFile,
    updateFn: (frontmatter: any) => void
): Promise<void> {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        updateFn(frontmatter);
    });
}

/**
 * Reads the frontmatter of a note.
 * 
 * @param app - The Obsidian App instance
 * @param file - The TFile to read
 * @returns The frontmatter object or null if none
 */
export function getFrontmatter(app: App, file: TFile): any | null {
    const cache = app.metadataCache.getFileCache(file);
    return cache?.frontmatter || null;
}
