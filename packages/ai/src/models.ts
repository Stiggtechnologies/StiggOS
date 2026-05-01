// Provider-aware model registry. Every surface picks a *role* ('agent' or
// 'fast'); this file resolves the role to a concrete model name based on the
// active provider. Environment variables override per role.

const env = (k: string, fb: string) => process.env[k] ?? fb;

export type ModelRole = 'agent' | 'fast';

export const DEFAULT_MODELS: Record<string, Record<ModelRole, string>> = {
  // Frontier API providers
  anthropic: {
    agent: env('ANTHROPIC_MODEL_AGENT', 'claude-opus-4-7'),
    fast:  env('ANTHROPIC_MODEL_FAST',  'claude-haiku-4-5-20251001'),
  },
  openai: {
    agent: env('OPENAI_MODEL_AGENT', 'gpt-4o'),
    fast:  env('OPENAI_MODEL_FAST',  'gpt-4o-mini'),
  },
  google: {
    agent: env('GOOGLE_MODEL_AGENT', 'gemini-2.5-pro'),
    fast:  env('GOOGLE_MODEL_FAST',  'gemini-2.5-flash'),
  },

  // Self-hosted / OpenAI-compatible (Ollama, vLLM, Groq, Together, Fireworks, OpenRouter, ...)
  // Defaults assume Ollama-style local install with the named tags pulled.
  // Override with OPENAI_MODEL_* env or per-deploy.
  openai_compatible: {
    agent: env('OPENAI_MODEL_AGENT', 'llama3.3:70b-instruct'),
    fast:  env('OPENAI_MODEL_FAST',  'llama3.1:8b-instruct'),
  },

  mock: { agent: 'mock', fast: 'mock' },
};

export function modelFor(providerName: string, role: ModelRole): string {
  return DEFAULT_MODELS[providerName]?.[role] ?? DEFAULT_MODELS.openai![role];
}

// Indicative pricing per million tokens (USD). Used for ai_sessions cost telemetry.
// Self-hosted = $0/token; the cost there is hardware/electricity which we
// don't try to model in code.
const PRICING: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-4-7':              { in: 15.00, out: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-sonnet-4-6':            { in:  3.00, out: 15.00, cacheRead: 0.30,  cacheWrite:  3.75 },
  'claude-haiku-4-5-20251001':    { in:  1.00, out:  5.00, cacheRead: 0.10,  cacheWrite:  1.25 },
  'gpt-4o':                       { in:  2.50, out: 10.00, cacheRead: 1.25,  cacheWrite:  0.00 },
  'gpt-4o-mini':                  { in:  0.15, out:  0.60, cacheRead: 0.075, cacheWrite:  0.00 },
  'gemini-2.5-pro':               { in:  1.25, out:  5.00, cacheRead: 0.31,  cacheWrite:  0.00 },
  'gemini-2.5-flash':             { in:  0.075,out:  0.30, cacheRead: 0.019, cacheWrite:  0.00 },
};

export function costFor(model: string, usage: {
  input_tokens: number; output_tokens: number;
  cache_read_input_tokens?: number; cache_creation_input_tokens?: number;
}): number {
  // Self-hosted models (e.g. llama*, qwen*, deepseek*, mistral* without a
  // pricing entry) have $0 marginal cost from the LLM perspective.
  const p = PRICING[model] ?? { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 };
  const cacheRead  = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const liveIn = Math.max(0, usage.input_tokens - cacheRead - cacheWrite);
  return (
    (liveIn       * p.in)         / 1_000_000 +
    (usage.output_tokens * p.out) / 1_000_000 +
    (cacheRead    * p.cacheRead)  / 1_000_000 +
    (cacheWrite   * p.cacheWrite) / 1_000_000
  );
}

// Backwards-compat re-export so existing imports of `MODELS.agent/fast` keep working.
// The values are the *Anthropic* defaults — surfaces that want provider-correct
// names should call modelFor(providerName, role) instead.
export const MODELS = {
  agent: DEFAULT_MODELS.anthropic!.agent,
  fast:  DEFAULT_MODELS.anthropic!.fast,
};
