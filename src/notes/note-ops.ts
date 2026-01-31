import { App, TFile, TFolder, normalizePath } from "obsidian";
import { ZettelForgeSettings } from "../config";
import { updateFrontmatter } from "../utils/frontmatter";

export class NoteOps {
    app: App;
    settings: ZettelForgeSettings;

    constructor(app: App, settings: ZettelForgeSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Ensures the inbox and final folders exist.
     * Returns true if they exist or were created, false on error.
     */
    async ensureFolders(): Promise<boolean> {
        try {
            await this.ensureFolder(this.settings.inboxFolder);
            await this.ensureFolder(this.settings.finalFolder);
            return true;
        } catch (error) {
            console.error("[ZettelForge] Failed to ensure folders:", error);
            return false;
        }
    }

    private async ensureFolder(path: string): Promise<void> {
        const normalized = normalizePath(path);
        const file = this.app.vault.getAbstractFileByPath(normalized);

        if (!file) {
            await this.app.vault.createFolder(normalized);
        } else if (!(file instanceof TFolder)) {
            throw new Error(`Path '${normalized}' exists but is not a folder.`);
        }
    }

    /**
     * Creates a new candidate note in the Inbox.
     * 
     * @param title - The title of the note
     * @param content - The markdown content (body)
     * @param frontmatter - Initial frontmatter object
     * @returns The created TFile or throws error
     */
    async createInboxNote(title: string, content: string, frontmatter: any): Promise<TFile> {
        await this.ensureFolder(this.settings.inboxFolder);

        // Sanitize title for filename
        const filename = title.replace(/[\\/:|#^[\]]/g, "") + ".md";
        const path = normalizePath(`${this.settings.inboxFolder}/${filename}`);

        // Prevent overwrite by appending simple counter if needed
        let finalPath = path;
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(finalPath)) {
            finalPath = normalizePath(`${this.settings.inboxFolder}/${title.replace(/[\\/:|#^[\]]/g, "")} (${counter}).md`);
            counter++;
        }

        // Construct initial file content with YAML
        // Note: We use manual YAML construction for creation because processFrontMatter works on existing files.
        // For robustness, we could create empty and then update, but that triggers 2 events.
        // A simple JSON-to-YAML helper is usually sufficient for initial creation.
        const yamlLines = ['---'];
        for (const [key, value] of Object.entries(frontmatter)) {
            // Basic serialization for M1 (strings, arrays, numbers)
            if (Array.isArray(value)) {
                yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
            } else {
                yamlLines.push(`${key}: ${value}`);
            }
        }
        yamlLines.push('---');
        yamlLines.push('');
        yamlLines.push(content);

        const fullContent = yamlLines.join('\n');
        const file = await this.app.vault.create(finalPath, fullContent);
        return file;
    }

    /**
     * Moves a note to the Final folder and updates metadata.
     */
    async finalizeNote(file: TFile, origin: 'ai' | 'human' = 'ai'): Promise<void> {
        await this.ensureFolder(this.settings.finalFolder);

        const newPath = normalizePath(`${this.settings.finalFolder}/${file.name}`);

        // 1. Update metadata first
        await updateFrontmatter(this.app, file, (fm) => {
            fm['status'] = 'final';
            fm['note_origin'] = origin;
            fm['date_modified'] = new Date().toISOString().split('T')[0];
        });

        // 2. Move file
        // Check collision
        let finalPath = newPath;
        if (this.app.vault.getAbstractFileByPath(finalPath)) {
            // If name collision, maybe append timestamp or keep increment logic? 
            // For M1, let's just append a counter to be safe.
            let counter = 1;
            const baseName = file.basename;
            while (this.app.vault.getAbstractFileByPath(finalPath)) {
                finalPath = normalizePath(`${this.settings.finalFolder}/${baseName} (${counter}).md`);
                counter++;
            }
        }

        await this.app.fileManager.renameFile(file, finalPath);
    }

    /**
     * Safely trashes a note.
     */
    async trashNote(file: TFile): Promise<void> {
        // system=true moves to OS trash, false to Obsidian .trash
        // SPEC says "Remove = delete permanently", but "no recycle behavior guaranteed".
        // Safest default is Obsidian trash (false) or System trash (true).
        // Let's use System trash (true) to prevent cluttering the vault, but it's recoverable.
        await this.app.vault.trash(file, true);
    }
}
