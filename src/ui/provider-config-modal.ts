import { App, Modal, Setting, Notice, DropdownComponent } from "obsidian";
import ZettelForgePlugin from "../main";
import { TokenManager } from "../services/token-manager";
import { DEFAULT_MODELS } from "../services/models";
import { AIService } from "../services/ai";

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
        this.tempApiKey = TokenManager.getToken(providerId) || '';
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
                .inputEl.type = "password"
            );

        // Model Selection Dropdown
        const modelSetting = new Setting(contentEl)
            .setName("Model Selection")
            .setDesc("Choose a model or enter a custom one");

        const models = DEFAULT_MODELS[this.providerId] || [];

        let modelDropdown: DropdownComponent;

        modelSetting.addDropdown(dropdown => {
            modelDropdown = dropdown;
            dropdown.addOption("custom", "Custom Model");
            models.forEach(m => {
                dropdown.addOption(m.id, `${m.name} (${m.cost})`);
            });

            // Determine initial value
            const isKnownModel = models.some(m => m.id === this.tempModel);
            dropdown.setValue(isKnownModel ? this.tempModel : "custom");

            dropdown.onChange(value => {
                if (value !== "custom") {
                    this.tempModel = value;
                    // Update the text input below
                    // We need a reference to the text component, but here we can just rebuild or update generic element
                    // Let's rely on the text input existing and being updateable
                    // But we constructed it below. So we need to do this differently.
                    // Better approach: create text input first, then update it.
                    const textInput = (this as any).modelTextInput; // We'll attach it
                    if (textInput) textInput.setValue(value);
                }
            });
        });

        // Model ID Text Input (for custom or manual override)
        new Setting(contentEl)
            .setName("Model ID")
            .setDesc("The actual model ID sent to the API")
            .addText(text => {
                (this as any).modelTextInput = text;
                text
                    .setPlaceholder("gpt-4o")
                    .setValue(this.tempModel)
                    .onChange(value => {
                        this.tempModel = value;
                        // If typed value matches a known model, update dropdown?
                        // Or just set to custom.
                        const isKnown = models.some(m => m.id === value);
                        modelDropdown.setValue(isKnown ? value : "custom");
                    })
            });

        // Buttons
        const buttonDiv = contentEl.createDiv({ cls: "modal-button-container" });

        // Test Button
        const testBtn = buttonDiv.createEl("button", { text: "Test Connection" });
        testBtn.onclick = async () => {
            new Notice(`Testing ${this.providerId}...`);
            if (!this.tempApiKey) {
                new Notice("Please enter an API Key first.");
                return;
            }
            try {
                const service = (this.plugin as any).aiService as AIService;
                await service.testConnection(this.providerId, this.tempApiKey);
                new Notice("Test Successful: Connection verified.");
            } catch (e: any) {
                new Notice(`Test Failed: ${e.message}`);
                console.error(e);
            }
        };

        // Save Button
        const saveBtn = buttonDiv.createEl("button", { text: "Save", cls: "mod-cta" });
        saveBtn.onclick = async () => {
            const settings = this.plugin.settings.providers[this.providerId as keyof typeof this.plugin.settings.providers];

            // Securely save token
            if (this.tempApiKey) {
                TokenManager.setToken(this.providerId, this.tempApiKey);
                settings.enabled = true;
            } else {
                TokenManager.deleteToken(this.providerId);
                settings.enabled = false;
            }

            settings.model = this.tempModel;

            await this.plugin.saveSettings();
            new Notice(`${this.getProviderName(this.providerId)} saved.`);
            this.close();
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
