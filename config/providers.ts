// LLM provider profiles. Two protocols cover the ecosystem:
//   - "anthropic":     POST {baseUrl}/v1/messages
//   - "openai_compat": POST {baseUrl}/chat/completions (OpenAI, OpenRouter, Groq,
//                      Together, Mistral, DeepSeek, xAI, Gemini's compat endpoint,
//                      and local servers like Ollama/LM Studio)
// Adding a provider = adding a profile here + a key in .env. Never a code change.
// Model ids drift — verify against your provider's docs before relying on one.

export type ProviderProfile = {
  protocol: "anthropic" | "openai_compat";
  baseUrl: string;
  model: string;
  /** Env var holding the API key; null for keyless local servers. */
  apiKeyEnv: string | null;
  maxTokens: number;
  /** openai_compat only — some providers want max_completion_tokens. */
  tokenParam?: "max_tokens" | "max_completion_tokens";
  /** openai_compat only — ask for response_format json_object (helps small local models). */
  jsonMode?: boolean;
  timeoutMs?: number;
};

export const PROVIDER_PROFILES: Record<string, ProviderProfile> = {
  anthropic: {
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-haiku-4-5",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    maxTokens: 1500,
  },
  anthropic_strong: {
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-6",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    maxTokens: 2500,
  },
  openai: {
    protocol: "openai_compat",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5-mini", // verify current id at platform.openai.com/docs
    apiKeyEnv: "OPENAI_API_KEY",
    maxTokens: 1500,
    tokenParam: "max_completion_tokens",
  },
  openrouter: {
    protocol: "openai_compat",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-haiku-4.5", // any openrouter slug works
    apiKeyEnv: "OPENROUTER_API_KEY",
    maxTokens: 1500,
  },
  gemini_compat: {
    protocol: "openai_compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // Verified available on the live key (2026-06): flash-lite is the cheap daily driver.
    // Upgrade path once quota allows: swap to "gemini-3.5-flash" (one-line change) for
    // materially better synthesis — the protocol/profile shape is identical.
    model: "gemini-3.1-flash-lite", // bare id — no "models/" prefix on the compat endpoint
    apiKeyEnv: "GEMINI_API_KEY",
    maxTokens: 4096, // headroom for the 12-sector monthly re-rate + richer nightly synthesis
    jsonMode: true, // Gemini honors response_format json_object; jsonsafe still backstops
  },
  // Pre-staged stronger sibling for the monthly stage re-rate. The model exists, but the
  // free-tier key may lack 3.5-flash quota — leave the `monthly` role on gemini_compat until
  // quota lands, then point it here (config/settings.ts). One-line switch; until then this
  // profile is simply unused and nothing 404s.
  gemini_strong: {
    protocol: "openai_compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.5-flash",
    apiKeyEnv: "GEMINI_API_KEY",
    maxTokens: 4096,
    jsonMode: true,
  },
  ollama_local: {
    protocol: "openai_compat",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1", // whatever tag you've pulled in ollama
    apiKeyEnv: null,
    maxTokens: 1500,
    jsonMode: true,
  },
};
