export const DEFAULT_MODELS: Record<string, Array<{ id: string, name: string, cost: string }>> = {
    openai: [
        { id: 'gpt-5-nano', name: 'gpt-5-nano', cost: '$0.05/$0.40' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini', cost: '$0.15/$0.60' },
        { id: 'gpt-5-mini', name: 'GPT-5 Mini', cost: '$0.25/$2.00' },
        { id: 'gpt-5.1', name: 'gpt-5.1', cost: '$1.25/$10.00' },
        { id: 'gpt-5.2', name: 'gpt-5.2', cost: '$1.75/$14.00' }
    ],
    google: [
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', cost: '$0.10/$0.40' },
        { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash', cost: '$0.30/$2.50' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', cost: '$0.50/$3.00' }
    ],
    anthropic: [
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', cost: '$0.80/$4' },
        { id: 'claude-4-5-haiku', name: 'Claude 4.5 Haiku', cost: '$1/$5' },
        { id: 'claude-4-5-sonnet', name: 'Claude 4.5 Sonnet', cost: '$3/$15' }
    ],
    openrouter: [
        { id: 'openai/gpt-5-nano', name: 'openai/gpt-5-nano', cost: '$0.05/$0.40' },
        { id: 'meta-llama/llama-4-scout', name: 'meta-llama/llama-4-scout', cost: '$0.08/$0.30' },
        { id: 'google/gemini-2.5-flash-lite', name: 'google/gemini-2.5-flash-lite', cost: '$0.10/$0.40' },
        { id: 'qwen/qwen3-235b-a22b-thinking-2507', name: 'qwen/qwen3...', cost: '$0.11/$0.60' },
        { id: 'openai/gpt-4o-mini', name: 'openai/gpt-4o-mini', cost: '$0.15/$0.60' },
        { id: 'mistralai/ministral-14b-2512', name: 'mistralai/ministral...', cost: '$0.20/$0.20' },
        { id: 'openai/gpt-5-mini', name: 'openai/gpt-5-mini', cost: '$0.25/$2.00' },
        { id: 'nex-agi/deepseek-v3.1-nex-n1', name: 'nex-agi/deepseek...', cost: '$0.27/$1' },
        { id: 'google/gemini-2.5-flash', name: 'google/gemini-2.5-flash', cost: '$0.30/$2.50' },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'meta-llama/llama-3.1-70b...', cost: '$0.40/$0.40' },
        { id: 'moonshotai/kimi-k2.5', name: 'moonshotai/kimi-k2.5', cost: '$0.45/$2.50' },
        { id: 'google/gemini-3-flash-preview', name: 'google/gemini-3-flash...', cost: '$0.50/$3' },
        { id: 'anthropic/claude-3.5-haiku', name: 'anthropic/claude-3.5-haiku', cost: '$0.80/$4' },
        { id: 'anthropic/claude-haiku-4.5', name: 'anthropic/claude-haiku-4.5', cost: '$1/$5' },
        { id: 'openai/gpt-5.1', name: 'openai/gpt-5.1', cost: '$1.25/$10.00' },
        { id: 'openai/gpt-5.2', name: 'openai/gpt-5.2', cost: '$1.75/$14.00' },
        { id: 'anthropic/claude-sonnet-4.5', name: 'anthropic/claude-sonnet-4.5', cost: '$3/$15' }
    ]
};

export const PROVIDER_URLS: Record<string, string> = {
    openai: 'https://platform.openai.com/docs/models',
    google: 'https://ai.google.dev/gemini-api/docs/models',
    anthropic: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    openrouter: 'https://openrouter.ai/models'
};
