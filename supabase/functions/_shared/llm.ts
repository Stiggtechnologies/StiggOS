// Multi-provider LLM dispatch — Deno edge runtime.
//
// Mirrors packages/ai/src/provider.ts. Same env vars; same selection logic.
//
// Provider selection order (LLM_PROVIDER=auto):
//   ANTHROPIC_API_KEY → anthropic
//   OPENAI_API_KEY    → openai
//   OPENAI_BASE_URL   → openai_compatible (Ollama / vLLM / Groq / Together / etc.)
//   GOOGLE_API_KEY    → google
//   else              → throws (no offline mock in the edge runtime — caller errors on missing key)

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface NormalizedMessage { role: Role; content: ContentBlock[] }

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface SystemBlock { text: string; cache: boolean }

export interface ProviderRequest {
  model: string;
  system: SystemBlock[];
  messages: NormalizedMessage[];
  tools?: ToolSpec[];
  max_tokens?: number;
  temperature?: number;
}

export interface ProviderResponse {
  model: string;
  stop_reason: string;
  content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export interface Provider {
  name: 'anthropic' | 'openai' | 'openai_compatible' | 'google';
  capabilities: { tools: boolean; promptCache: boolean };
  complete(req: ProviderRequest): Promise<ProviderResponse>;
}

export function getProvider(): Provider {
  const forced = (Deno.env.get('LLM_PROVIDER') ?? 'auto').toLowerCase();
  const ant   = Deno.env.get('ANTHROPIC_API_KEY');
  const oai   = Deno.env.get('OPENAI_API_KEY');
  const oaiBu = Deno.env.get('OPENAI_BASE_URL');
  const gKey  = Deno.env.get('GOOGLE_API_KEY');

  const choose = (() => {
    if (forced === 'anthropic') return 'anthropic';
    if (forced === 'openai') return 'openai';
    if (forced === 'openai_compatible' || forced === 'ollama' || forced === 'vllm') return 'openai_compatible';
    if (forced === 'google') return 'google';
    if (ant) return 'anthropic';
    if (oai) return 'openai';
    if (oaiBu) return 'openai_compatible';
    if (gKey) return 'google';
    throw new Error('No LLM provider configured. Set ANTHROPIC_API_KEY / OPENAI_API_KEY / OPENAI_BASE_URL / GOOGLE_API_KEY.');
  })();

  if (choose === 'anthropic') return makeAnthropic(ant!, Deno.env.get('ANTHROPIC_BASE_URL'));
  if (choose === 'openai')    return makeOpenAI(oai!, undefined, 'openai');
  if (choose === 'openai_compatible') {
    if (!oaiBu) throw new Error('openai_compatible requires OPENAI_BASE_URL');
    return makeOpenAI(oai ?? 'sk-no-key-required', oaiBu, 'openai_compatible');
  }
  return makeGoogle(gKey!, Deno.env.get('GOOGLE_BASE_URL'));
}

export function modelFor(provider: Provider, role: 'agent' | 'fast'): string {
  const e = (k: string, fb: string) => Deno.env.get(k) ?? fb;
  switch (provider.name) {
    case 'anthropic':         return role === 'agent' ? e('ANTHROPIC_MODEL_AGENT', 'claude-opus-4-7')   : e('ANTHROPIC_MODEL_FAST', 'claude-haiku-4-5-20251001');
    case 'openai':            return role === 'agent' ? e('OPENAI_MODEL_AGENT',    'gpt-4o')            : e('OPENAI_MODEL_FAST',    'gpt-4o-mini');
    case 'openai_compatible': return role === 'agent' ? e('OPENAI_MODEL_AGENT',    'llama3.3:70b-instruct') : e('OPENAI_MODEL_FAST', 'llama3.1:8b-instruct');
    case 'google':            return role === 'agent' ? e('GOOGLE_MODEL_AGENT',    'gemini-2.5-pro')    : e('GOOGLE_MODEL_FAST',    'gemini-2.5-flash');
  }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

function makeAnthropic(apiKey: string, baseUrl?: string): Provider {
  const url = (baseUrl ?? 'https://api.anthropic.com');
  return {
    name: 'anthropic',
    capabilities: { tools: true, promptCache: true },
    async complete(req) {
      const body = {
        model: req.model,
        system: req.system.map((s) => ({
          type: 'text', text: s.text,
          ...(s.cache ? { cache_control: { type: 'ephemeral' } } : {}),
        })),
        messages: req.messages.map((m) => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content.map((b) => {
            if (b.type === 'text')        return { type: 'text', text: b.text };
            if (b.type === 'tool_use')    return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
            return { type: 'tool_result', tool_use_id: b.tool_use_id, content: b.content, ...(b.is_error ? { is_error: true } : {}) };
          }),
        })),
        ...(req.tools ? { tools: req.tools } : {}),
        max_tokens: req.max_tokens ?? 4096,
        temperature: req.temperature ?? 0.2,
      };
      const r = await fetch(`${url}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
      const j = await r.json();
      return {
        model: j.model,
        stop_reason: j.stop_reason ?? 'end_turn',
        content: (j.content ?? []).map((b: any) => {
          if (b.type === 'text') return { type: 'text', text: String(b.text ?? '') };
          if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
          return { type: 'text', text: '' };
        }),
        usage: {
          input_tokens: j.usage?.input_tokens ?? 0,
          output_tokens: j.usage?.output_tokens ?? 0,
          cache_read_input_tokens: j.usage?.cache_read_input_tokens,
          cache_creation_input_tokens: j.usage?.cache_creation_input_tokens,
        },
      };
    },
  };
}

// ─── OpenAI / OpenAI-compatible (Ollama, vLLM, Groq, Together, ...) ─────────

function makeOpenAI(apiKey: string, baseUrl: string | undefined, name: 'openai' | 'openai_compatible'): Provider {
  const url = (baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  return {
    name,
    capabilities: { tools: true, promptCache: false },
    async complete(req) {
      const sys = req.system.map((s) => s.text).join('\n\n');
      const messages: any[] = [];
      if (sys) messages.push({ role: 'system', content: sys });
      for (const m of req.messages) {
        const text = m.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n');
        const tu   = m.content.filter((b) => b.type === 'tool_use') as any[];
        const tr   = m.content.filter((b) => b.type === 'tool_result') as any[];
        if (m.role === 'assistant') {
          messages.push({
            role: 'assistant', content: text || null,
            ...(tu.length ? { tool_calls: tu.map((x) => ({ id: x.id, type: 'function', function: { name: x.name, arguments: JSON.stringify(x.input ?? {}) } })) } : {}),
          });
        } else if (m.role === 'tool' || tr.length) {
          for (const x of tr) messages.push({ role: 'tool', tool_call_id: x.tool_use_id, content: x.is_error ? `ERROR: ${x.content}` : x.content });
        } else {
          messages.push({ role: m.role, content: text });
        }
      }
      const body: any = {
        model: req.model,
        messages,
        ...(req.tools ? {
          tools: req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
          tool_choice: 'auto',
        } : {}),
        temperature: req.temperature ?? 0.2,
        max_tokens: req.max_tokens ?? 4096,
      };
      const r = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${name} ${r.status}: ${await r.text()}`);
      const j = await r.json();
      const ch = j.choices?.[0]; if (!ch) throw new Error(`${name}: empty choices`);
      const out: ProviderResponse['content'] = [];
      const txt = ch.message?.content;
      if (typeof txt === 'string' && txt) out.push({ type: 'text', text: txt });
      for (const tc of (ch.message?.tool_calls ?? [])) {
        if (tc.type !== 'function') continue;
        let parsed: unknown = {};
        try { parsed = JSON.parse(tc.function.arguments ?? '{}'); }
        catch { parsed = { _raw: tc.function.arguments }; }
        out.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: parsed });
      }
      const stop = ch.finish_reason === 'tool_calls' ? 'tool_use'
                 : ch.finish_reason === 'length'     ? 'max_tokens'
                 : 'end_turn';
      return {
        model: j.model ?? req.model, stop_reason: stop, content: out,
        usage: {
          input_tokens: j.usage?.prompt_tokens ?? 0,
          output_tokens: j.usage?.completion_tokens ?? 0,
          cache_read_input_tokens: j.usage?.prompt_tokens_details?.cached_tokens,
        },
      };
    },
  };
}

// ─── Google / Gemini ────────────────────────────────────────────────────────

function makeGoogle(apiKey: string, baseUrl?: string): Provider {
  const url = baseUrl ?? 'https://generativelanguage.googleapis.com';
  return {
    name: 'google',
    capabilities: { tools: true, promptCache: false },
    async complete(req) {
      const body: any = {
        contents: req.messages.map((m) => {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const parts: any[] = [];
          for (const b of m.content) {
            if (b.type === 'text') parts.push({ text: b.text });
            else if (b.type === 'tool_use') parts.push({ functionCall: { name: b.name, args: b.input ?? {} } });
            else if (b.type === 'tool_result') {
              let payload: unknown;
              try { payload = JSON.parse(b.content); } catch { payload = { result: b.content }; }
              parts.push({ functionResponse: { name: 'tool', response: { content: payload } } });
            }
          }
          return { role, parts };
        }),
        ...(req.system.length ? { systemInstruction: { parts: [{ text: req.system.map((s) => s.text).join('\n\n') }] } } : {}),
        ...(req.tools ? { tools: [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }] } : {}),
        generationConfig: { temperature: req.temperature ?? 0.2, maxOutputTokens: req.max_tokens ?? 4096 },
      };
      const r = await fetch(`${url}/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`google ${r.status}: ${await r.text()}`);
      const j = await r.json();
      const c = j.candidates?.[0]; if (!c) throw new Error('google: no candidates');
      const out: ProviderResponse['content'] = [];
      let seq = 0;
      for (const p of c.content?.parts ?? []) {
        if (typeof p.text === 'string' && p.text) out.push({ type: 'text', text: p.text });
        else if (p.functionCall) out.push({ type: 'tool_use', id: `gem_${Date.now()}_${seq++}`, name: p.functionCall.name, input: p.functionCall.args ?? {} });
      }
      const fin = c.finishReason ?? 'STOP';
      const stop = fin === 'STOP' ? (out.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn')
                 : fin === 'MAX_TOKENS' ? 'max_tokens' : String(fin).toLowerCase();
      return {
        model: req.model, stop_reason: stop, content: out,
        usage: {
          input_tokens: j.usageMetadata?.promptTokenCount ?? 0,
          output_tokens: j.usageMetadata?.candidatesTokenCount ?? 0,
          cache_read_input_tokens: j.usageMetadata?.cachedContentTokenCount,
        },
      };
    },
  };
}
