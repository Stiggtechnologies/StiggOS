// Unit-test the OpenAI adapter by stubbing global fetch — no real calls.
// We assert that:
//   • the request body is in OpenAI chat-completions shape
//   • tool calls round-trip into our normalized tool_use blocks
//   • a tool_result message becomes role:'tool' on the wire

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeOpenAI } from '../src/providers/openai.js';
import type { ProviderRequest } from '../src/providers/types.js';

const KEY = 'sk-test';

function mockResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const baseReq: ProviderRequest = {
  model: 'gpt-4o',
  system: [{ text: 'You are X.', cache: true }],
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
  tools: [{ name: 't1', description: 'desc', input_schema: { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] } }],
};

describe('OpenAI adapter', () => {
  it('serializes the request in chat-completions shape', async () => {
    (globalThis.fetch as any).mockResolvedValue(mockResponse({
      model: 'gpt-4o',
      choices: [{ finish_reason: 'stop', message: { content: 'ok' } }],
      usage: { prompt_tokens: 10, completion_tokens: 2 },
    }));

    const p = makeOpenAI({ apiKey: KEY, name: 'openai' });
    const r = await p.complete(baseReq);
    expect(r.stop_reason).toBe('end_turn');
    expect(r.content).toEqual([{ type: 'text', text: 'ok' }]);

    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe('gpt-4o');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are X.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'hello' });
    expect(body.tools[0].type).toBe('function');
    expect(body.tools[0].function.name).toBe('t1');
    expect(body.tool_choice).toBe('auto');
  });

  it('parses tool_calls into normalized tool_use blocks', async () => {
    (globalThis.fetch as any).mockResolvedValue(mockResponse({
      model: 'gpt-4o',
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          content: null,
          tool_calls: [{
            id: 'call_1', type: 'function',
            function: { name: 't1', arguments: JSON.stringify({ x: 'y' }) },
          }],
        },
      }],
      usage: { prompt_tokens: 5, completion_tokens: 3 },
    }));

    const p = makeOpenAI({ apiKey: KEY, name: 'openai' });
    const r = await p.complete(baseReq);
    expect(r.stop_reason).toBe('tool_use');
    expect(r.content).toEqual([{ type: 'tool_use', id: 'call_1', name: 't1', input: { x: 'y' } }]);
  });

  it('converts a tool_result message into role:"tool"', async () => {
    (globalThis.fetch as any).mockResolvedValue(mockResponse({
      model: 'gpt-4o',
      choices: [{ finish_reason: 'stop', message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }));

    const p = makeOpenAI({ apiKey: KEY, name: 'openai' });
    await p.complete({
      ...baseReq,
      messages: [
        ...baseReq.messages,
        { role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 't1', input: { x: 'y' } }] },
        { role: 'tool', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: '{"ok":true}' }] },
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    const last = body.messages[body.messages.length - 1];
    expect(last.role).toBe('tool');
    expect(last.tool_call_id).toBe('call_1');
    expect(last.content).toBe('{"ok":true}');
  });

  it('honors a custom baseUrl for OSS / openai_compatible', async () => {
    (globalThis.fetch as any).mockResolvedValue(mockResponse({
      model: 'llama3.3:70b-instruct',
      choices: [{ finish_reason: 'stop', message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }));

    const p = makeOpenAI({ apiKey: 'no-key', baseUrl: 'http://localhost:11434/v1', name: 'openai_compatible' });
    await p.complete({ ...baseReq, model: 'llama3.3:70b-instruct' });

    expect((globalThis.fetch as any).mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('throws on non-200 with body included', async () => {
    (globalThis.fetch as any).mockResolvedValue(new Response('bad', { status: 500 }));
    const p = makeOpenAI({ apiKey: KEY, name: 'openai' });
    await expect(p.complete(baseReq)).rejects.toThrow(/openai 500/);
  });
});
