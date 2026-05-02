import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAnthropic } from '../src/providers/anthropic.js';

function res(b: unknown) { return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Anthropic adapter', () => {
  it('marks cached system blocks with cache_control:ephemeral', async () => {
    (globalThis.fetch as any).mockResolvedValue(res({
      model: 'claude-opus-4-7', stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const p = makeAnthropic({ apiKey: 'sk-ant' });
    await p.complete({
      model: 'claude-opus-4-7',
      system: [
        { text: 'static', cache: true },
        { text: 'dynamic', cache: false },
      ],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    });
    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.system[1].cache_control).toBeUndefined();
  });

  it('parses tool_use blocks', async () => {
    (globalThis.fetch as any).mockResolvedValue(res({
      model: 'claude-opus-4-7', stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'thinking…' },
        { type: 'tool_use', id: 'tu_1', name: 'foo', input: { a: 1 } },
      ],
      usage: { input_tokens: 5, output_tokens: 3 },
    }));
    const p = makeAnthropic({ apiKey: 'sk-ant' });
    const r = await p.complete({
      model: 'claude-opus-4-7',
      system: [{ text: 'x', cache: true }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    });
    expect(r.stop_reason).toBe('tool_use');
    expect(r.content).toHaveLength(2);
    expect(r.content[1]).toMatchObject({ type: 'tool_use', name: 'foo', id: 'tu_1' });
  });
});
