import { App, Modal, Setting, Notice } from "obsidian";
import ZettelForgePlugin from "../main";

export class ProviderConfigModal extends Modal {
    plugin: ZettelForgePlugin;
    providerId: string;
    tempApiKey: string;
    tempModel: string;

    constructor(app: App, plugin: ZettelForgePlugin, providerId: string) {
        super(app);
        this.plugin = plugin;
        this.providerId = providerId;

        const currentSettings = this.plugin.settings.providers[providerId as keyof typeof this.plugin.settings.providers];
        this.tempApiKey = currentSettings.apiKey;
        this.tempModel = currentSettings.model;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: `Configure ${this.getProviderName(this.providerId)}` });

        // API Key Field
        new Setting(contentEl)
            .setName("API Key")
            .setDesc("Enter your API Key")
            .addText(text => text
                .setPlaceholder("sk-...")
                .setValue(this.tempApiKey)
                .onChange(value => this.tempApiKey = value)
                .inputEl.type = "password" // Simple obfuscation for UI
            );

        // Model ID Field
        new Setting(contentEl)
            .setName("Model ID")
            .setDesc("The model ID to use")
            .addText(text => text
                .setPlaceholder("gpt-4o")
                .setValue(this.tempModel)
                .onChange(value => this.tempModel = value)
            );

        // Buttons
        const buttonDiv = contentEl.createDiv({ cls: "modal-button-container" });

        // Test Button
        const testBtn = buttonDiv.createEl("button", { text: "Test Connection" });
        testBtn.onclick = async () => {
            new Notice(`Testing ${this.providerId}...`);
            try {
                // In real implementation we'd actually call the API
                // await this.plugin.aiService.testConnection(this.providerId, this.tempApiKey);
                new Notice("Test Successful (Simulated)");
            } catch (e) {
                new Notice(`Test Failed: ${e.message}`);
            }
        };

        // Save Button
        const saveBtn = buttonDiv.createEl("button", { text: "Save", cls: "mod-cta" });
        saveBtn.onclick = async () => {
            const settings = this.plugin.settings.providers[this.providerId as keyof typeof this.plugin.settings.providers];
            settings.apiKey = this.tempApiKey;
            settings.model = this.tempModel;
            settings.enabled = !!this.tempApiKey;

            await this.plugin.saveSettings();
            new Notice(`${this.getProviderName(this.providerId)} saved.`);
            this.close();
            // Trigger refresh of settings tab if possible? 
            // We can't easily refresh the parent tab from here without a callback.
            // Ideally we pass a callback.
        };

        // Cancel Button
        const cancelBtn = buttonDiv.createEl("button", { text: "Cancel" });
        cancelBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    getProviderName(id: string): string {
        switch (id) {
            case 'openai': return 'OpenAI';
            case 'google': return 'Google AI';
            case 'anthropic': return 'Anthropic';
            case 'openrouter': return 'OpenRouter';
            default: return id;
        }
    }
}
