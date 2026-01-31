import { App, Modal, TFile, Setting, ButtonComponent, Notice } from "obsidian";
import { NoteOps } from "../notes/note-ops";
import { getFrontmatter, updateFrontmatter } from "../utils/frontmatter";

export class ReviewModal extends Modal {
    files: TFile[];
    currentIndex: number;
    noteOps: NoteOps;

    constructor(app: App, files: TFile[], noteOps: NoteOps) {
        super(app);
        this.files = files;
        this.noteOps = noteOps;
        this.currentIndex = 0;
    }

    onOpen() {
        this.render();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    async render() {
        const { contentEl } = this;
        contentEl.empty();

        if (this.currentIndex >= this.files.length) {
            contentEl.createEl("h2", { text: "All candidates processed!" });
            new Setting(contentEl).addButton(btn => btn
                .setButtonText("Close")
                .onClick(() => this.close()));
            return;
        }

        const file = this.files[this.currentIndex];
        const content = await this.app.vault.read(file);
        const frontmatter = getFrontmatter(this.app, file);

        // Header
        contentEl.createEl("h2", { text: `Reviewing: ${file.basename}` });
        contentEl.createEl("small", { text: `Candidate ${this.currentIndex + 1} of ${this.files.length}` });

        // Metadata Preview (Read-Onlyish for now)
        const metadataDiv = contentEl.createDiv({ cls: "zettelforge-metadata" });
        metadataDiv.createEl("p", { text: `Origin: ${frontmatter?.note_origin || 'unknown'}` });

        // Content Preview (Editable TextArea could go here, but for M1 let's just show it)
        // To make it editable, we'd need a TextArea but that gets complex with saving back to file.
        // For M1, we assume they review the text. If they want to edit, maybe we add an "Open in Editor" button?
        // SPEC says: "Displays ONE candidate note at a time: Title, Claim, Support... (editable)"
        // Let's us a simple TextArea for the whole body for M1 to allow quick fixes.
        const textArea = contentEl.createEl("textarea", {
            text: content,
            cls: "zettelforge-review-editor"
        });
        textArea.style.width = "100%";
        textArea.style.height = "300px";

        // Actions Bar
        const actionsDiv = contentEl.createDiv({ cls: "zettelforge-actions" });
        actionsDiv.style.marginTop = "20px";
        actionsDiv.style.display = "flex";
        actionsDiv.style.gap = "10px";
        actionsDiv.style.justifyContent = "flex-end";

        // 1. Cancel (Keep in Inbox)
        new ButtonComponent(actionsDiv)
            .setButtonText("Skip / Keep")
            .onClick(() => {
                this.next();
            });

        // 2. Remove (Delete)
        new ButtonComponent(actionsDiv)
            .setButtonText("Remove (Delete)")
            .setWarning()
            .onClick(async () => {
                if (confirm(`Permanently delete "${file.basename}"?`)) {
                    await this.noteOps.trashNote(file);
                    new Notice(`Deleted ${file.basename}`);
                    this.files.splice(this.currentIndex, 1);
                    // index stays same, list shrinks
                    this.render();
                }
            });

        // 3. Finalize
        new ButtonComponent(actionsDiv)
            .setButtonText("Finalize")
            .setCta()
            .onClick(async () => {
                // Save edits first if any
                if (textArea.value !== content) {
                    await this.app.vault.modify(file, textArea.value);
                }

                await this.noteOps.finalizeNote(file);
                new Notice(`Finalized ${file.basename}`);
                this.files.splice(this.currentIndex, 1);
                this.render();
            });
    }

    next() {
        this.currentIndex++;
        this.render();
    }
}
