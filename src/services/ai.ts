import { requestUrl, RequestUrlParam, App, Notice } from "obsidian";
import { ZettelForgeSettings } from "../config";

export interface AtomicCandidate {
    title: string;
    type: 'question' | 'claim' | 'evidence' | 'principle';
    atomic_claim: string;
    support_snippet: string;
    suggested_links: string[];
    tags: string[];
    confidence: 'high' | 'medium' | 'low';
}

export interface AIProvider {
    id: string;
    name: string;
    generate(content: string, settings: any): Promise<AtomicCandidate[]>;
}

export class AIService {
    settings: ZettelForgeSettings;

    constructor(settings: ZettelForgeSettings) {
        this.settings = settings;
    }

    async generateCandidates(content: string, overrideProviderId?: string): Promise<AtomicCandidate[]> {
        const providerId = overrideProviderId || this.settings.defaultProvider;
        const providerSettings = this.settings.providers[providerId as keyof typeof this.settings.providers];

        if (!providerSettings) {
            throw new Error(`Provider settings not found for: ${providerId}`);
        }

        let provider: AIProvider;

        switch (providerId) {
            case 'openai':
                provider = new OpenAICompatibleProvider('openai', 'OpenAI', 'https://api.openai.com/v1/chat/completions');
                break;
            case 'openrouter':
                provider = new OpenAICompatibleProvider('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1/chat/completions');
                break;
            case 'anthropic':
                provider = new AnthropicProvider();
                break;
            case 'google':
                provider = new GoogleProvider();
                break;
            default:
                throw new Error(`Unknown provider: ${providerId}`);
        }

        try {
            return await provider.generate(content, providerSettings);
        } catch (error) {
            console.error("[ZettelForge] AI Generation Error:", error);
            // Try to extract more details from the error if possible
            const msg = error.message || error.toString();
            new Notice(`AI Error: ${msg}`);
            return [];
        }
    }

    async testConnection(providerId: string, apiKey: string): Promise<boolean> {
        // Simple test: try to generate a tiny response
        try {
            // We create a temporary settings object just for the test
            const testSettings = { ...this.settings.providers[providerId as keyof typeof this.settings.providers] };
            testSettings.apiKey = apiKey;

            // We need to instantiate the provider
            let provider: AIProvider;
            switch (providerId) {
                case 'openai': provider = new OpenAICompatibleProvider('openai', 'OpenAI', 'https://api.openai.com/v1/chat/completions'); break;
                case 'openrouter': provider = new OpenAICompatibleProvider('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1/chat/completions'); break;
                case 'anthropic': provider = new AnthropicProvider(); break;
                case 'google': provider = new GoogleProvider(); break;
                default: throw new Error(`Unknown provider: ${providerId}`);
            }

            // We send a dummy request. This might cost a tiny bit of tokens but ensures validity.
            // We can't easily valid API key otherwise without specific endpoints per provider.
            // For now, let's just assume if we can instantiate it's okay? No, we need a network call.
            // Let's send a "Hello" prompt.
            // Ideally providers would have a listModels endpoint which is cheaper/free.

            // For simplicity in M1, we'll try to generate "Hello". 
            // Ideally we should use list models if available.

            // Let's just return true for now to scaffold the UI, then implement real test.
            // User requested "Test" button. 
            // Let's try to fetch models list for OpenAI/OpenRouter, and generate one token for others.

            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
}


// --- Providers ---

const SYSTEM_PROMPT = `
You are an Atomic Knowledge Extraction Agent.

Your task is to extract HIGH-UTILITY ATOMIC NOTES from a single source note.
The source note may be a literature note, video summary, or conceptual note.

Your goal is NOT to summarize.
Your goal is to produce reusable intellectual building blocks that will remain useful
across time, topics, and domains.

────────────────────────────────────────
CORE DEFINITION (MANDATORY)
────────────────────────────────────────

An atomic note is a SINGLE, STANDALONE unit of thought that:

- Performs ONE intellectual function only
- Can be reused independently of the original source
- Can later be recombined with other notes to generate new insights
- Makes sense without rereading the source note

An atomic note may satisfy all quality criteria above, but it must perform only ONE intellectual role.
If a note mixes roles (e.g. claim + evidence, question + conclusion), it is NOT atomic enough.

────────────────────────────────────────
WHAT TO EXTRACT (QEC-BASED)
────────────────────────────────────────

From the source note, extract candidate atomic notes of the following types (one or many of each type):

1. QUESTION  
   - A clearly stated inquiry or problem
   - Something that could guide future thinking or research

2. CLAIM / CONCLUSION  
   - A single assertion, principle, or takeaway
   - Declarative, not narrative
   - Not mixed with evidence or explanation

3. EVIDENCE / OBSERVATION  
   - A concrete observation, example, or justification
   - Something that could later support multiple claims

4. PRINCIPLE / HEURISTIC  
   - A general rule, design principle, or best practice
   - Expressed abstractly enough to apply beyond the original context

Each Question, each Claim, and each Evidence MUST become its OWN atomic note.
Do NOT bundle them.

────────────────────────────────────────
ATOMICITY CONSTRAINTS (CRITICAL)
────────────────────────────────────────

For EVERY atomic note candidate:

- It must express ONLY ONE idea
- It must be understandable on its own
- It must NOT depend on phrases like:
  “this video”, “the author”, “as shown above”
- It must be rewritten as a standalone sentence or short paragraph

If the idea is still tied to narrative flow, split it further.

────────────────────────────────────────
UTILITY & REUSABILITY TEST (INTERNAL)
────────────────────────────────────────

Before outputting a candidate, silently check:

1. Could this note be reused in a DIFFERENT domain?
2. Could this note support a DIFFERENT argument later?
3. Could this note be linked meaningfully to other ideas?

If the answer to all three is “no”, discard or rework it.

────────────────────────────────────────
RELATIONAL READINESS (DO NOT OVER-EXPLAIN)
────────────────────────────────────────

Each atomic note should be suitable for later connection via:

- Origin (conceptual lineage): Earlier theories, ideas, or traditions this idea builds on. This does NOT refer to the source note or document.
- Similarity: related or analogous ideas
- Opposition: limits, contradictions, or competing ideas
- Extension: applications or next steps

You do NOT need to list these explicitly.
Simply ensure the note is written in a way that makes such connections possible.

────────────────────────────────────────
EPISTEMIC DISCIPLINE
────────────────────────────────────────

- Clearly distinguish:
  - Questions vs claims vs evidence vs principles
- Do NOT invent support
- If no explicit support exists in the source note, mark it as "N/A"
- Preserve uncertainty when present

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────

Return ONLY valid JSON.
No commentary. No markdown.

Output an array of objects using this schema:

[
  {
    "title": "Short, precise title capturing the idea",
    "type": "question | claim | evidence | principle",
    "atomic_claim": "The core extracted idea...",
    "support_snippet": "Verbatim quote...",
    "confidence": 0.0-1.0,
    "suggested_links": ["[[Related Concept]]"],
    "tags": ["keyword1", "keyword2"]
  }
]

────────────────────────────────────────
FINAL QUALITY BAR
────────────────────────────────────────

It is BETTER to return fewer, high-quality atomic notes
than many shallow or bundled ones.

Every atomic note should feel like something you would WANT
to reuse in writing, teaching, or thinking years from now.
`;

class OpenAICompatibleProvider implements AIProvider {
    id: string;
    name: string;
    defaultBaseUrl: string;

    constructor(id: string, name: string, defaultBaseUrl: string) {
        this.id = id;
        this.name = name;
        this.defaultBaseUrl = defaultBaseUrl;
    }

    async generate(content: string, settings: any): Promise<AtomicCandidate[]> {
        if (!settings.apiKey) throw new Error(`${this.name} API key is missing.`);

        // Use custom URL if provided, else default. Ensure it allows overriding for local LLMs too.
        let url = settings.baseUrl;
        if (!url || url.trim() === '') {
            url = this.defaultBaseUrl;
        }

        const payload = {
            model: settings.model || (this.id === 'openai' ? 'gpt-4o' : 'google/gemini-pro-1.5'),
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Source Text:\n\n${content}` }
            ],
            temperature: 0.7,
            // OpenRouter supports response_format but sometimes it varies. 
            // Safer to conditionally add it or just rely on the system prompt.
            // OpenAI definitely supports it.
            ...(this.id === 'openai' ? { response_format: { type: "json_object" } } : {})
        };

        // OpenRouter requires specific headers
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
        };

        if (this.id === 'openrouter') {
            headers["HTTP-Referer"] = "https://github.com/your-repo/zettelforge"; // Optional req for OpenRouter
            headers["X-Title"] = "ZettelForge";
        }

        const params: RequestUrlParam = {
            url: url,
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        };

        try {
            const response = await requestUrl(params);
            if (response.status >= 300) {
                throw new Error(`Status ${response.status}: ${response.text}`);
            }
            const data = response.json;
            const text = data.choices[0].message.content;
            return this.parseResponse(text);
        } catch (error) {
            // requestUrl throws on 4xx/5xx, but we can't always see the body easily unless we catch it.
            // However obsidian's error object isn't always standard.
            console.error("OpenAI/Router Request Failed", error);
            throw error;
        }
    }

    parseResponse(text: string): AtomicCandidate[] {
        // Clean markdown code blocks if present (common with OpenRouter models)
        const cleanText = text.replace(/```json\n?|\n?```/g, '');

        try {
            const parsed = JSON.parse(cleanText);
            if (parsed.notes && Array.isArray(parsed.notes)) return parsed.notes;
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object') return [parsed];
            return [];
        } catch (e) {
            console.error("Failed to parse JSON", text);
            throw new Error(`Invalid JSON response from AI: ${text.substring(0, 100)}...`);
        }
    }
}

class AnthropicProvider implements AIProvider {
    id = 'anthropic';
    name = 'Anthropic';

    async generate(content: string, settings: any): Promise<AtomicCandidate[]> {
        if (!settings.apiKey) throw new Error("Anthropic API key is missing.");

        const url = settings.baseUrl || 'https://api.anthropic.com/v1/messages';

        const payload = {
            model: settings.model || 'claude-3-5-sonnet-20240620',
            max_tokens: 4096,
            system: SYSTEM_PROMPT, // Top-level system parameter for Messages API
            messages: [
                { role: "user", content: `Source Text:\n\n${content}` }
            ]
        };

        const params: RequestUrlParam = {
            url: url,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": settings.apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(payload)
        };

        const response = await requestUrl(params);

        if (response.status !== 200) {
            // requestUrl might throw before this if status is bad, but just in case
            throw new Error(`Anthropic Error ${response.status}`);
        }

        const data = response.json;
        const text = data.content[0].text;
        return this.parseResponse(text);
    }

    parseResponse(text: string): AtomicCandidate[] {
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;

        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.notes && Array.isArray(parsed.notes)) return parsed.notes;
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (e) {
            throw new Error("AI response was not valid JSON");
        }
    }
}

class GoogleProvider implements AIProvider {
    id = 'google';
    name = 'Google Gemini';

    async generate(content: string, settings: any): Promise<AtomicCandidate[]> {
        if (!settings.apiKey) throw new Error("Google API key is missing.");

        const model = settings.model || 'gemini-1.5-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: `${SYSTEM_PROMPT}\n\nSource Text:\n\n${content}` }]
            }],
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        const params: RequestUrlParam = {
            url: url,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        };

        // Google throws detailed JSON errors. failed requestUrl usually throws generic error.
        // To debug, we might want to wrap this.
        try {
            const response = await requestUrl(params);
            if (response.status !== 200) throw new Error(`Google Status ${response.status}`);

            const data = response.json;
            const text = data.candidates[0].content.parts[0].text;

            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) return parsed;
                return parsed.notes || [parsed];
            } catch (e) {
                throw new Error("AI response was not valid JSON");
            }
        } catch (e) {
            // Often the error body has details
            console.error("Google API Error", e);
            throw new Error(`Google Generation Failed. Check API Key/Model Name. Details: ${e.message}`);
        }
    }
}
