
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ZettelForgePlugin from '../main';
import { ProviderConfigModal } from '../ui/provider-config-modal';

export class ZettelForgeSettingTab extends PluginSettingTab {
    plugin: ZettelForgePlugin;

    constructor(app: App, plugin: ZettelForgePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'ZettelForge Settings' });

        const providers = ['openai', 'google', 'anthropic', 'openrouter'];

        providers.forEach(pId => {
            const pSettings = this.plugin.settings.providers[pId as keyof typeof this.plugin.settings.providers];
            const pName = this.getProviderName(pId);

            const card = containerEl.createDiv({ cls: 'zettelforge-provider-card' });
            // Basic styling for the card inline for now, ideally moved to CSS
            card.style.border = '1px solid var(--background-modifier-border)';
            card.style.borderRadius = '5px';
            card.style.padding = '10px';
            card.style.marginBottom = '10px';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';

            const info = card.createDiv();
            info.createEl('h3', { text: pName, attr: { style: 'margin: 0 0 5px 0;' } });

            if (pSettings.enabled && pSettings.apiKey) {
                info.createEl('div', { text: '✓ Configured', attr: { style: 'color: var(--text-success); font-size: 0.8em;' } });
            } else {
                info.createEl('div', { text: 'Not configured', attr: { style: 'color: var(--text-muted); font-size: 0.8em;' } });
            }

            const btnContainer = card.createDiv();

            new Setting(btnContainer)
                .addButton(btn => btn
                    .setButtonText(pSettings.apiKey ? "Reconfigure" : "Configure")
                    .onClick(() => {
                        new ProviderConfigModal(this.app, this.plugin, pId).open();
                        // Hacky way to refresh when modal closes? 
                        // For now user has to close/reopen settings or we rely on events.
                    }))
                .addButton(btn => btn
                    .setButtonText("Clear")
                    .onClick(async () => {
                        pSettings.apiKey = '';
                        pSettings.enabled = false;
                        await this.plugin.saveSettings();
                        this.display(); // Force refresh
                    }));
            // Remove the extra setting containers divs details
            btnContainer.querySelectorAll('.setting-item').forEach(el => {
                (el as HTMLElement).style.border = 'none';
                (el as HTMLElement).style.padding = '0';
            });
        });

        // Default Model Dropdown
        new Setting(containerEl)
            .setName('Default Model')
            .setDesc('Select the default AI model to use for enrichment')
            .addDropdown(dropdown => {
                dropdown.addOption('openai', 'OpenAI');
                dropdown.addOption('google', 'Google Gemini');
                dropdown.addOption('anthropic', 'Anthropic');
                dropdown.addOption('openrouter', 'OpenRouter');

                dropdown.setValue(this.plugin.settings.defaultProvider);

                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultProvider = value;
                    await this.plugin.saveSettings();
                });
            });

        // Folders Section
        containerEl.createEl('h3', { text: 'Folders' });

        new Setting(containerEl)
            .setName('Inbox Folder')
            .setDesc('Folder where generated notes are saved initially.')
            .addText(text => text
                .setPlaceholder('Inbox')
                .setValue(this.plugin.settings.inboxFolder)
                .onChange(async (value) => {
                    this.plugin.settings.inboxFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Final Folder')
            .setDesc('Folder where finalized atomic notes are moved.')
            .addText(text => text
                .setPlaceholder('Zettelkasten')
                .setValue(this.plugin.settings.finalFolder)
                .onChange(async (value) => {
                    this.plugin.settings.finalFolder = value;
                    await this.plugin.saveSettings();
                }));
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

