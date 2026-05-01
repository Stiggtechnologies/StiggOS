// Google / Gemini adapter. Wire format is functionCall / functionResponse
// parts inside contents[]. system_instruction is its own top-level field.
//
// Models: gemini-2.5-pro, gemini-2.5-flash, etc.

import type {
  ContentBlock, NormalizedMessage, Provider, ProviderRequest, ProviderResponse,
} from './types.js';

export function makeGoogle(opts: { apiKey: string; baseUrl?: string }): Provider {
  const baseUrl = opts.baseUrl ?? 'https://generativelanguage.googleapis.com';
  return {
    name: 'google',
    capabilities: { tools: true, promptCache: false },
    async complete(req: ProviderRequest): Promise<ProviderResponse> {
      const body: Record<string, unknown> = {
        contents: req.messages.map(toGoogleMessage),
        ...(req.system.length ? {
          systemInstruction: { parts: [{ text: req.system.map((s) => s.text).join('\n\n') }] },
        } : {}),
        ...(req.tools ? {
          tools: [{
            functionDeclarations: req.tools.map((t) => ({
              name: t.name, description: t.description, parameters: t.input_schema,
            })),
          }],
        } : {}),
        generationConfig: {
          temperature: req.temperature ?? 0.2,
          maxOutputTokens: req.max_tokens ?? 4096,
        },
      };

      const url = `${baseUrl}/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`google ${r.status}: ${await r.text()}`);
      const json = await r.json();
      const candidate = json.candidates?.[0];
      if (!candidate) throw new Error('google: no candidates');

      const out: ProviderResponse['content'] = [];
      let toolCallSeq = 0;
      for (const part of candidate.content?.parts ?? []) {
        if (typeof part.text === 'string' && part.text.length > 0) {
          out.push({ type: 'text', text: part.text });
        } else if (part.functionCall) {
          // Gemini doesn't return ids on function calls; mint one for our internal pairing.
          const id = `gem_${Date.now()}_${toolCallSeq++}`;
          out.push({ type: 'tool_use', id, name: part.functionCall.name, input: part.functionCall.args ?? {} });
        }
      }

      const finish = candidate.finishReason ?? 'STOP';
      const stop = finish === 'STOP' ? (out.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn')
                 : finish === 'MAX_TOKENS' ? 'max_tokens' : finish.toLowerCase();

      return {
        model: req.model,
        stop_reason: stop,
        content: out,
        usage: {
          input_tokens:  json.usageMetadata?.promptTokenCount ?? 0,
          output_tokens: json.usageMetadata?.candidatesTokenCount ?? 0,
          cache_read_input_tokens: json.usageMetadata?.cachedContentTokenCount,
        },
      };
    },
  };
}

function toGoogleMessage(m: NormalizedMessage): Record<string, unknown> {
  const role = m.role === 'assistant' ? 'model' : 'user';
  const parts: Array<Record<string, unknown>> = [];
  for (const b of m.content as ContentBlock[]) {
    if (b.type === 'text')        parts.push({ text: b.text });
    else if (b.type === 'tool_use')   parts.push({ functionCall: { name: b.name, args: b.input ?? {} } });
    else if (b.type === 'tool_result') {
      // Gemini requires the response to be paired by name; tool_use_id is opaque.
      // We carry the JSON content through and let the model match by tool name.
      let payload: unknown;
      try { payload = JSON.parse(b.content); }
      catch { payload = { result: b.content }; }
      parts.push({ functionResponse: { name: 'tool', response: { content: payload } } });
    }
  }
  return { role, parts };
}
