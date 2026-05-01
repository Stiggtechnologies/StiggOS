// Anthropic / Claude adapter. Implemented with raw fetch — no SDK dep.
//
// Wire format notes:
//   • system → either string OR an array of {text, cache_control?} blocks.
//     We pass the array form so cacheable blocks can be marked individually.
//   • tools → {name, description, input_schema}
//   • messages → role:'user'|'assistant', content can be string or blocks.
//     Tool calls come back as content[] entries with type:'tool_use';
//     tool results go back as user-role content[] with type:'tool_result'.

import type {
  ContentBlock, NormalizedMessage, Provider, ProviderRequest, ProviderResponse,
} from './types.js';

interface AntInput {
  type: 'text' | 'tool_use' | 'tool_result';
  [k: string]: unknown;
}

export function makeAnthropic(opts: { apiKey: string; baseUrl?: string }): Provider {
  const baseUrl = opts.baseUrl ?? 'https://api.anthropic.com';
  return {
    name: 'anthropic',
    capabilities: { tools: true, promptCache: true },
    async complete(req: ProviderRequest): Promise<ProviderResponse> {
      const body = {
        model: req.model,
        system: req.system.map((s) => ({
          type: 'text',
          text: s.text,
          ...(s.cache ? { cache_control: { type: 'ephemeral' } } : {}),
        })),
        messages: req.messages.map(toAntMessage),
        ...(req.tools ? { tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })) } : {}),
        max_tokens: req.max_tokens ?? 4096,
        temperature: req.temperature ?? 0.2,
      };
      const r = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
      const json = await r.json();
      return {
        model: json.model,
        stop_reason: json.stop_reason ?? 'end_turn',
        content: (json.content ?? []).map((b: AntInput) => {
          if (b.type === 'text')      return { type: 'text', text: String(b.text ?? '') };
          if (b.type === 'tool_use')  return { type: 'tool_use', id: String(b.id), name: String(b.name), input: b.input };
          return { type: 'text', text: '' };
        }),
        usage: {
          input_tokens: json.usage?.input_tokens ?? 0,
          output_tokens: json.usage?.output_tokens ?? 0,
          cache_read_input_tokens: json.usage?.cache_read_input_tokens,
          cache_creation_input_tokens: json.usage?.cache_creation_input_tokens,
        },
      };
    },
  };
}

function toAntMessage(m: NormalizedMessage): { role: 'user' | 'assistant'; content: AntInput[] | string } {
  const role = m.role === 'tool' ? 'user' : (m.role as 'user' | 'assistant');
  const content: AntInput[] = m.content.map((b: ContentBlock) => {
    if (b.type === 'text')        return { type: 'text', text: b.text };
    if (b.type === 'tool_use')    return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
    return {
      type: 'tool_result',
      tool_use_id: b.tool_use_id,
      content: b.content,
      ...(b.is_error ? { is_error: true } : {}),
    };
  });
  return { role, content };
}
