
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ZettelForgePlugin from '../main';
import { SYSTEM_PROMPT } from '../services/ai';
import { TokenManager } from '../services/token-manager';
import { PROVIDER_URLS } from '../services/models';
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

            // Add Model Info Link
            const modelUrl = PROVIDER_URLS[pId];
            if (modelUrl) {
                info.createEl('a', {
                    text: 'View Models & Pricing',
                    href: modelUrl,
                    attr: { target: '_blank', style: 'font-size: 0.8em; color: var(--text-accent); display: block; margin-bottom: 5px;' }
                });
            }

            const hasToken = !!TokenManager.getToken(pId);

            if (pSettings.enabled && hasToken) {
                const badge = info.createEl('span', { text: 'Configured', cls: 'zettelforge-badge-success' });
                badge.style.backgroundColor = 'var(--text-success)';
                badge.style.color = 'var(--text-on-accent)';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '0.7em';
                badge.style.fontWeight = 'bold';
            } else {
                const badge = info.createEl('span', { text: 'Not Configured', cls: 'zettelforge-badge-error' });
                badge.style.backgroundColor = 'var(--text-error)';
                badge.style.color = 'var(--text-on-accent)';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '0.7em';
                badge.style.fontWeight = 'bold';
            }

            const btnContainer = card.createDiv();

            new Setting(btnContainer)
                .addButton(btn => btn
                    .setButtonText(hasToken ? "Reconfigure" : "Configure")
                    .onClick(() => {
                        const modal = new ProviderConfigModal(this.app, this.plugin, pId);
                        modal.onClose = () => {
                            // Refresh logic when modal closes
                            this.display();
                        };
                        modal.open();
                    }))
                .addButton(btn => btn
                    .setButtonText("Clear")
                    .onClick(async () => {
                        TokenManager.deleteToken(pId);
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

        containerEl.createEl('h2', { text: 'AI Instructions' });

        const promptSetting = new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Customize the instructions given to the AI.')
            .addButton(btn => btn
                .setButtonText('Reset to Default')
                .setWarning()
                .setTooltip('Restore the default highly-optimized prompt')
                .onClick(async () => {
                    if (!confirm('Are you sure you want to reset the system prompt to default?')) return;
                    this.plugin.settings.systemPrompt = 'DEFAULT';
                    await this.plugin.saveSettings();
                    // Update the text area immediately
                    const textArea = promptSetting.controlEl.querySelector('textarea');
                    if (textArea) textArea.value = SYSTEM_PROMPT;
                    new Notice('System Prompt reset to default.');
                }))
            .addTextArea(text => text
                .setPlaceholder('Enter custom system prompt...')
                .setValue(this.plugin.settings.systemPrompt === 'DEFAULT' ? SYSTEM_PROMPT : this.plugin.settings.systemPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.systemPrompt = value;
                    await this.plugin.saveSettings();
                }));

        // Style adjustments for vertical layout
        promptSetting.settingEl.style.display = 'block'; // Stack name/desc on top of controls if needed, or stick to default
        // Actually, for large text areas, it's often better to just let it flow or force block

        const infoEl = promptSetting.infoEl;
        const controlEl = promptSetting.controlEl;

        // Force the text area to break to a new line if possible, or just style it
        promptSetting.controlEl.querySelector('textarea')?.setAttr('rows', 15);
        promptSetting.controlEl.querySelector('textarea')?.setAttr('style', 'width: 100%; min-height: 250px; margin-top: 10px;');
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

