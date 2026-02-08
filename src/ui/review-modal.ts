import { App, Modal, TFile, Setting, ButtonComponent, Notice, TextComponent, TextAreaComponent } from "obsidian";
import { NoteOps } from "../notes/note-ops";
import { getFrontmatter, updateFrontmatter } from "../utils/frontmatter";
import { DedupService } from "../services/dedup";

export class ReviewModal extends Modal {
    files: TFile[];
    currentIndex: number;
    noteOps: NoteOps;
    dedupService: DedupService;

    constructor(app: App, files: TFile[], noteOps: NoteOps, dedupService: DedupService) {
        super(app);
        this.files = files;
        this.noteOps = noteOps;
        this.dedupService = dedupService;
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

        // --- DEDUPLICATION CHECKS ---
        // 1. Hard Check (Exact/Alias Title)
        const dupTitle = this.dedupService.isTitleDuplicate(file.basename);

        // 2. Soft Check (Content Similarity)
        // Check against Atomic Notes Folder AND other candidates in Inbox (this.files)
        // Pass 'this.files' as extraFiles, and exclude current 'file.path' to avoid self-match.
        const dupContent = await this.dedupService.findSimilar(content, 0.5, this.files, file.path);


        // Header
        contentEl.createEl("h2", { text: `Reviewing: ${file.basename}` });
        contentEl.createEl("small", { text: `Candidate ${this.currentIndex + 1} of ${this.files.length}` });

        // --- WARNINGS DISPLAY ---
        if (dupTitle.exists) {
            const warnDiv = contentEl.createDiv({ cls: 'zettelforge-warning-box' });
            warnDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            warnDiv.style.border = '1px solid red';
            warnDiv.style.padding = '10px';
            warnDiv.style.marginBottom = '15px';
            warnDiv.createEl('strong', { text: '⚠️ CRITICAL: Duplicate Title Detected' });
            warnDiv.createEl('p', { text: `A note named "${dupTitle.originalName}" already exists. You MUST rename this note before finalizing.` });
        }

        if (dupContent.length > 0) {
            const infoDiv = contentEl.createDiv({ cls: 'zettelforge-info-box' });
            infoDiv.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
            infoDiv.style.border = '1px solid orange';
            infoDiv.style.padding = '10px';
            infoDiv.style.marginBottom = '15px';
            infoDiv.createEl('strong', { text: '⚠️ Potential Content Duplicates' });
            const ul = infoDiv.createEl('ul');
            dupContent.forEach(d => {
                const link = d.file.basename;
                ul.createEl('li', { text: `${link} (Similarity: ${(d.score * 100).toFixed(0)}%) - ${d.reason}` });
            });
        }


        // Metadata Preview (Read-Onlyish for now)
        const metadataDiv = contentEl.createDiv({ cls: "zettelforge-metadata" });
        metadataDiv.createEl("p", { text: `Origin: ${frontmatter?.note_origin || 'unknown'}` });

        // Content Preview (Editable TextArea could go here, but for M1 let's just show it)
        // To make it editable, we'd need a TextArea but that gets complex with saving back to file.
        // For M1, we assume they review the text. If they want to edit, maybe we add an "Open in Editor" button?
        // SPEC says: "Displays ONE candidate note at a time: Title, Claim, Support... (editable)"
        // Let's us a simple TextArea for the whole body for M1 to allow quick fixes.
        // Title Input
        const titleContainer = contentEl.createDiv({ cls: 'zettelforge-review-title' });
        titleContainer.style.marginBottom = '10px';

        let newTitle = file.basename;
        const titleInput = new TextComponent(titleContainer)
            .setValue(newTitle)
            .setPlaceholder('Note Title')
            .onChange(val => newTitle = val);
        titleInput.inputEl.style.width = '100%';
        titleInput.inputEl.style.fontSize = '1.2em';
        titleInput.inputEl.style.fontWeight = 'bold';

        // Body Input
        let newBody = content;
        const bodyInput = new TextAreaComponent(contentEl)
            .setValue(content)
            .onChange(val => newBody = val);

        bodyInput.inputEl.style.width = '100%';
        bodyInput.inputEl.style.height = '300px';
        bodyInput.inputEl.style.fontFamily = 'monospace';

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
                // 1. Update Body if changed
                if (newBody !== content) {
                    await this.app.vault.modify(file, newBody);
                }

                // 2. Rename File if Title changed
                if (newTitle !== file.basename) {
                    const newPath = file.parent ? `${file.parent.path}/${newTitle}.md` : `${newTitle}.md`;
                    try {
                        const renamed = await this.app.fileManager.renameFile(file, newPath);
                    } catch (err) {
                        new Notice(`Failed to rename to "${newTitle}". Only content saved.`);
                        console.error(err);
                        // If rename fails (likely collision), we shouldn't finalize yet?
                        // Or we force them to fix it.
                        return; // Stop here if rename fails
                    }
                }

                // 3. Finalize (Move to permanent folder)
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
