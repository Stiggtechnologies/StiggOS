// Deno test for the multi-provider LLM dispatcher. Run via:
//   deno test -A supabase/functions/_shared/llm.test.ts

import { assert, assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getProvider, modelFor } from './llm.ts';

function clearEnv() {
  for (const k of [
    'LLM_PROVIDER','ANTHROPIC_API_KEY','ANTHROPIC_BASE_URL','OPENAI_API_KEY',
    'OPENAI_BASE_URL','GOOGLE_API_KEY','GOOGLE_BASE_URL',
    'ANTHROPIC_MODEL_AGENT','OPENAI_MODEL_AGENT','GOOGLE_MODEL_AGENT',
  ]) Deno.env.delete(k);
}

Deno.test('throws when no provider configured', () => {
  clearEnv();
  let err: unknown;
  try { getProvider(); } catch (e) { err = e; }
  assert(err instanceof Error && /No LLM provider configured/.test(err.message));
});

Deno.test('selects anthropic when only that key is set', () => {
  clearEnv();
  Deno.env.set('ANTHROPIC_API_KEY', 'sk-ant-x');
  assertEquals(getProvider().name, 'anthropic');
});

Deno.test('selects openai when only that key is set', () => {
  clearEnv();
  Deno.env.set('OPENAI_API_KEY', 'sk-x');
  assertEquals(getProvider().name, 'openai');
});

Deno.test('selects openai_compatible when only base URL is set', () => {
  clearEnv();
  Deno.env.set('OPENAI_BASE_URL', 'http://localhost:11434/v1');
  assertEquals(getProvider().name, 'openai_compatible');
});

Deno.test('selects google when only google key is set', () => {
  clearEnv();
  Deno.env.set('GOOGLE_API_KEY', 'g-x');
  assertEquals(getProvider().name, 'google');
});

Deno.test('forced provider errors when its key is missing', () => {
  clearEnv();
  Deno.env.set('LLM_PROVIDER', 'anthropic');
  let err: unknown;
  try { getProvider(); } catch (e) { err = e; }
  assert(err instanceof Error);
});

Deno.test('modelFor returns the env-overridden agent model', () => {
  clearEnv();
  Deno.env.set('OPENAI_API_KEY', 'sk-x');
  Deno.env.set('OPENAI_MODEL_AGENT', 'gpt-4.1');
  const provider = getProvider();
  assertEquals(modelFor(provider, 'agent'), 'gpt-4.1');
});

Deno.test('OpenAI adapter sends OpenAI-shape requests (mocked fetch)', async () => {
  clearEnv();
  Deno.env.set('OPENAI_API_KEY', 'sk-test');

  const original = globalThis.fetch;
  let captured: { url: string; body: any } | null = null;
  globalThis.fetch = (async (input: any, init?: any) => {
    captured = { url: String(input), body: JSON.parse(String(init?.body ?? '{}')) };
    return new Response(JSON.stringify({
      model: 'gpt-4o',
      choices: [{ finish_reason: 'stop', message: { content: 'hi' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const provider = getProvider();
    await provider.complete({
      model: 'gpt-4o',
      system: [{ text: 'sys', cache: true }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    });
    assert(captured);
    assertEquals(captured.url, 'https://api.openai.com/v1/chat/completions');
    assertEquals(captured.body.model, 'gpt-4o');
    assertEquals(captured.body.messages[0].role, 'system');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('non-2xx response is rethrown with status', async () => {
  clearEnv();
  Deno.env.set('OPENAI_API_KEY', 'sk-test');
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof fetch;
  try {
    const provider = getProvider();
    await assertRejects(() => provider.complete({
      model: 'gpt-4o',
      system: [{ text: 's', cache: false }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }],
    }), Error, '500');
  } finally {
    globalThis.fetch = original;
  }
});
