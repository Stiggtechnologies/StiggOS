// OpenAI adapter — also covers every OpenAI-compatible endpoint, which is
// how the open-source ecosystem exposes itself:
//
//   • Self-hosted Llama / Mistral / Qwen / DeepSeek via vLLM, llama.cpp
//     server, LM Studio, Ollama, TGI, Text-generation-webui
//   • Hosted: Together, Groq, Fireworks, DeepInfra, Hyperbolic, OpenRouter,
//     Perplexity, Mistral cloud
//
// Set OPENAI_BASE_URL to point at any of these. Tool calling uses the OpenAI
// "tools" + "tool_calls" / role:'tool' shape — supported by GPT-4o, GPT-4.x,
// and most of the open-source instruct models above.

import type {
  ContentBlock, NormalizedMessage, Provider, ProviderRequest, ProviderResponse,
} from './types.js';

export function makeOpenAI(opts: {
  apiKey: string;
  baseUrl?: string;
  /** Adapter name — 'openai' for the real thing, 'openai_compatible' for self-hosted/3rd-party. */
  name?: 'openai' | 'openai_compatible';
}): Provider {
  const baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  return {
    name: opts.name ?? 'openai',
    capabilities: { tools: true, promptCache: false },
    async complete(req: ProviderRequest): Promise<ProviderResponse> {
      const body: Record<string, unknown> = {
        model: req.model,
        messages: toOAIMessages(req),
        ...(req.tools ? {
          tools: req.tools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          })),
          tool_choice: 'auto',
        } : {}),
        temperature: req.temperature ?? 0.2,
        max_tokens: req.max_tokens ?? 4096,
      };
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${opts.name ?? 'openai'} ${r.status}: ${await r.text()}`);
      const json = await r.json();
      const choice = json.choices?.[0];
      if (!choice) throw new Error('openai: empty choices');

      const out: ProviderResponse['content'] = [];
      const text = choice.message?.content;
      if (typeof text === 'string' && text.length > 0) out.push({ type: 'text', text });
      const toolCalls = choice.message?.tool_calls ?? [];
      for (const tc of toolCalls) {
        if (tc.type !== 'function') continue;
        let parsed: unknown = {};
        try { parsed = JSON.parse(tc.function.arguments ?? '{}'); }
        catch { parsed = { _raw: tc.function.arguments }; }
        out.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: parsed });
      }

      const stop = (() => {
        const fr = choice.finish_reason;
        if (fr === 'tool_calls') return 'tool_use';
        if (fr === 'length')     return 'max_tokens';
        if (fr === 'stop')       return 'end_turn';
        return fr ?? 'end_turn';
      })();

      return {
        model: json.model ?? req.model,
        stop_reason: stop,
        content: out,
        usage: {
          input_tokens: json.usage?.prompt_tokens ?? 0,
          output_tokens: json.usage?.completion_tokens ?? 0,
          // Some providers report cached prompt tokens — capture when present.
          cache_read_input_tokens: json.usage?.prompt_tokens_details?.cached_tokens,
        },
      };
    },
  };
}

function toOAIMessages(req: ProviderRequest): Array<Record<string, unknown>> {
  const sys = req.system.map((s) => s.text).join('\n\n');
  const out: Array<Record<string, unknown>> = [];
  if (sys) out.push({ role: 'system', content: sys });
  for (const m of req.messages) out.push(...convert(m));
  return out;
}

function convert(m: NormalizedMessage): Array<Record<string, unknown>> {
  const text = m.content.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n');
  const toolUses = m.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
  const toolResults = m.content.filter((b): b is Extract<ContentBlock, { type: 'tool_result' }> => b.type === 'tool_result');

  if (m.role === 'assistant') {
    return [{
      role: 'assistant',
      content: text || null,
      ...(toolUses.length ? {
        tool_calls: toolUses.map((tu) => ({
          id: tu.id,
          type: 'function',
          function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
        })),
      } : {}),
    }];
  }
  if (m.role === 'tool' || toolResults.length > 0) {
    // OpenAI requires one role:'tool' message per tool_result.
    return toolResults.map((tr) => ({
      role: 'tool',
      tool_call_id: tr.tool_use_id,
      content: tr.is_error ? `ERROR: ${tr.content}` : tr.content,
    }));
  }
  return [{ role: m.role, content: text }];
}
