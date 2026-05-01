// Provider registry. Auto-selects from env vars; explicit override via LLM_PROVIDER.
//
//   LLM_PROVIDER=auto              (default)
//     1. mock        if AI_FORCE_MOCK=1 or no provider keys are set
//     2. anthropic   if ANTHROPIC_API_KEY
//     3. openai      if OPENAI_API_KEY (real api.openai.com)
//     4. openai_compatible if OPENAI_BASE_URL is set (Ollama / vLLM / Groq / etc.)
//     5. google      if GOOGLE_API_KEY
//
//   LLM_PROVIDER=anthropic|openai|openai_compatible|google|mock
//     forces a specific adapter. Errors if its required env is missing.
//
// The harness only knows about the normalized Provider interface — providers
// can be added without touching agents or surfaces.

import type { Provider } from './providers/types.js';
import { makeAnthropic } from './providers/anthropic.js';
import { makeOpenAI } from './providers/openai.js';
import { makeGoogle } from './providers/google.js';
import { makeMock } from './providers/mock.js';

export type { Provider, ProviderRequest, ProviderResponse, NormalizedMessage, ToolSpec } from './providers/types.js';

let cached: Provider | null = null;

export function getProvider(): Provider {
  if (cached) return cached;
  cached = build();
  return cached;
}

export function resetProviderForTests() { cached = null; }

function build(): Provider {
  const env = {
    forced: (process.env.LLM_PROVIDER ?? 'auto').toLowerCase(),
    forceMock: process.env.AI_FORCE_MOCK === '1' || process.env.AI_PROVIDER === 'mock',
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    anthropicBase: process.env.ANTHROPIC_BASE_URL,
    openaiKey: process.env.OPENAI_API_KEY,
    openaiBase: process.env.OPENAI_BASE_URL,
    googleKey: process.env.GOOGLE_API_KEY,
    googleBase: process.env.GOOGLE_BASE_URL,
  };

  // Forced mock wins — useful in tests / CI.
  if (env.forceMock || env.forced === 'mock') return makeMock();

  if (env.forced === 'anthropic') {
    if (!env.anthropicKey) throw new Error('LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY missing');
    return makeAnthropic({ apiKey: env.anthropicKey, baseUrl: env.anthropicBase });
  }
  if (env.forced === 'openai') {
    if (!env.openaiKey) throw new Error('LLM_PROVIDER=openai but OPENAI_API_KEY missing');
    return makeOpenAI({ apiKey: env.openaiKey, baseUrl: env.openaiBase, name: 'openai' });
  }
  if (env.forced === 'openai_compatible' || env.forced === 'ollama' || env.forced === 'vllm') {
    if (!env.openaiBase) throw new Error('LLM_PROVIDER=openai_compatible requires OPENAI_BASE_URL');
    // Many self-hosted servers don't require a key. Use 'sk-anything' as a placeholder.
    return makeOpenAI({ apiKey: env.openaiKey ?? 'sk-no-key-required', baseUrl: env.openaiBase, name: 'openai_compatible' });
  }
  if (env.forced === 'google') {
    if (!env.googleKey) throw new Error('LLM_PROVIDER=google but GOOGLE_API_KEY missing');
    return makeGoogle({ apiKey: env.googleKey, baseUrl: env.googleBase });
  }

  // auto
  if (env.anthropicKey) return makeAnthropic({ apiKey: env.anthropicKey, baseUrl: env.anthropicBase });
  if (env.openaiKey)    return makeOpenAI({ apiKey: env.openaiKey, baseUrl: env.openaiBase, name: 'openai' });
  if (env.openaiBase)   return makeOpenAI({ apiKey: env.openaiKey ?? 'sk-no-key-required', baseUrl: env.openaiBase, name: 'openai_compatible' });
  if (env.googleKey)    return makeGoogle({ apiKey: env.googleKey, baseUrl: env.googleBase });
  return makeMock();
}
