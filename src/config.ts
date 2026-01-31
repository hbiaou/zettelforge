
export interface ZettelForgeSettings {
    // AI Provider Details
    aiProvider: string;
    apiKey: string;
    modelId: string;
    model: string;
    baseUrl?: string;
}

export interface ZettelForgeSettings {
    defaultProvider: string;
    providers: {
        openai: ProviderSettings;
        google: ProviderSettings;
        anthropic: ProviderSettings;
        openrouter: ProviderSettings;
    };
    inboxFolder: string;
    finalFolder: string;
}

export const DEFAULT_SETTINGS: ZettelForgeSettings = {
    defaultProvider: 'google',
    providers: {
        openai: { enabled: false, apiKey: '', model: 'gpt-4o' },
        google: { enabled: true, apiKey: '', model: 'gemini-1.5-flash' },
        anthropic: { enabled: false, apiKey: '', model: 'claude-3-5-sonnet-20240620' },
        openrouter: { enabled: false, apiKey: '', model: 'anthropic/claude-3.5-sonnet' }
    },
    inboxFolder: 'Inbox',
    finalFolder: 'Zettelkasten'
};
