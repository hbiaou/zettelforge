import { Plugin, Notice, TFile, TFolder } from "obsidian";
import { ZettelForgeSettings, DEFAULT_SETTINGS } from "./config";
import { ZettelForgeSettingTab } from "./settings/tab";
import { NoteOps } from "./notes/note-ops";
import { AIService } from "./services/ai";
import { ContextService } from "./services/context";
import { ReviewModal } from "./ui/review-modal";

export default class ZettelForgePlugin extends Plugin {
    settings: ZettelForgeSettings;
    noteOps: NoteOps;
    aiService: AIService;
    contextService: ContextService;

    async onload() {
        await this.loadSettings();

        // Initialize Services
        this.noteOps = new NoteOps(this.app, this.settings);
        this.contextService = new ContextService(this.app);
        this.aiService = new AIService(this.settings);

        this.addSettingTab(new ZettelForgeSettingTab(this.app, this));

        // Command 1: Generate candidates
        this.addCommand({
            id: 'generate-candidates',
            name: 'Generate candidates from current note',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice("No active file.");
                    return;
                }

                const content = await this.app.vault.read(activeFile);
                new Notice(`Generating candidates from "${activeFile.basename}"...`);

                try {
                    // Context Retrieval (RAG)
                    new Notice("Scanning vault for relevant context...");
                    const context = await this.contextService.findRelevantNotes(content);
                    if (context.length > 0) {
                        new Notice(`Found ${context.length} relevant notes.`);
                    }

                    const candidates = await this.aiService.generateCandidates(content, undefined, context);

                    if (candidates.length === 0) {
                        new Notice("No candidates generated.");
                        return;
                    }

                    for (const c of candidates) {
                        const frontmatter = {
                            note_type: 'atomic-note',
                            note_category: c.type,
                            status: 'inbox',
                            note_origin: 'ai',
                            source_note: `[[${activeFile.basename}]]`,
                            source_path: activeFile.path,
                            date_created: new Date().toISOString().split('T')[0],
                            date_modified: new Date().toISOString().split('T')[0],
                            model: this.settings.defaultProvider, // Use default provider for now or store specific
                            confidence: c.confidence,
                            tags: c.tags || []
                        };

                        let body = `# ${c.title}\n\n## ${c.type.toUpperCase()}\n${c.atomic_claim}\n\n## Support\n${c.support_snippet}\n`;

                        // Append suggested links to body if present
                        if (c.suggested_links && c.suggested_links.length > 0) {
                            body += `\n## Suggested Links\n${c.suggested_links.join('\n')}\n`;
                        }

                        await this.noteOps.createInboxNote(c.title, body, frontmatter);
                    }

                    new Notice(`Generated ${candidates.length} candidates in Inbox.`);

                    // Optional: Trigger review immediately?
                    // SPEC: "Opens the review workflow on the first candidate"
                    // Let's fire the review command programmatically or just call logic
                    this.activateReview();

                } catch (error) {
                    new Notice(`Generation failed: ${error.message}`);
                    console.error(error);
                }
            }
        });

        // Command 2: Review Inbox
        this.addCommand({
            id: 'review-inbox',
            name: 'Review Inbox candidates',
            callback: () => {
                this.activateReview();
            }
        });

        console.log("Loading ZettelForge plugin");
    }

    async activateReview() {
        const inboxPath = this.settings.inboxFolder;
        let folder = this.app.vault.getAbstractFileByPath(inboxPath);

        // If inbox doesn't exist, create it (safe fallback)
        if (!folder) {
            await this.noteOps.ensureFolders();
            folder = this.app.vault.getAbstractFileByPath(inboxPath);
        }

        if (!folder || !(folder instanceof TFolder)) {
            new Notice(`Inbox folder "${inboxPath}" not found.`);
            return;
        }

        // Get all MD files in inbox
        const files: TFile[] = [];
        // Need to iterate explicitly as children is a collection
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            }
        }

        if (files.length === 0) {
            new Notice("Inbox is empty.");
            return;
        }

        new ReviewModal(this.app, files, this.noteOps).open();
    }

    async onunload() {
        console.log("Unloading ZettelForge plugin");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
