// Provider-agnostic agent loop for the Deno edge runtime. Mirrors the Node
// harness — same normalized types, same tool-call semantics. Any LLM that
// supports tool calling (Claude, GPT-4o, Gemini, Llama 3.x, Mistral, Qwen,
// DeepSeek instruct variants) plugs in via _shared/llm.ts.

import { getProvider, modelFor, type Provider, type ProviderResponse, type NormalizedMessage } from './llm.ts';

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
}

export interface LoopArgs {
  /** Logical role; the active provider resolves to a concrete model name. */
  modelRole?: 'agent' | 'fast';
  /** Hard override — ignores modelRole. Use sparingly. */
  modelOverride?: string;
  systemStatic: string;
  systemDynamic?: string;
  userMessage: string;
  tools: ToolDef[];
  maxIterations?: number;
  temperature?: number;
}

export interface LoopResult {
  finalText: string;
  iterations: number;
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
  usageTotals: { input: number; output: number; cacheRead: number; cacheWrite: number };
  modelUsed: string;
  providerUsed: string;
}

export async function runLoop(args: LoopArgs): Promise<LoopResult> {
  const provider: Provider = getProvider();
  const model = args.modelOverride ?? modelFor(provider, args.modelRole ?? 'agent');

  const messages: NormalizedMessage[] = [
    { role: 'user', content: [{ type: 'text', text: args.userMessage }] },
  ];
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const toolCalls: Array<{ name: string; input: unknown; output: unknown }> = [];
  const maxIter = args.maxIterations ?? 6;
  let resp!: ProviderResponse;

  for (let iter = 1; iter <= maxIter; iter++) {
    resp = await provider.complete({
      model,
      system: [
        { text: args.systemStatic, cache: true },
        ...(args.systemDynamic ? [{ text: args.systemDynamic, cache: false }] : []),
      ],
      messages,
      tools: provider.capabilities.tools ? args.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })) : undefined,
      temperature: args.temperature ?? 0.2,
    });

    totals.input      += resp.usage.input_tokens ?? 0;
    totals.output     += resp.usage.output_tokens ?? 0;
    totals.cacheRead  += resp.usage.cache_read_input_tokens ?? 0;
    totals.cacheWrite += resp.usage.cache_creation_input_tokens ?? 0;

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason !== 'tool_use') {
      const finalText = resp.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text).join('\n').trim();
      return { finalText, iterations: iter, toolCalls, usageTotals: totals, modelUsed: resp.model, providerUsed: provider.name };
    }

    const toolBlocks = resp.content.filter((b): b is { type: 'tool_use'; id: string; name: string; input: unknown } => b.type === 'tool_use');
    const results: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = [];

    for (const tu of toolBlocks) {
      const def = args.tools.find((t) => t.name === tu.name);
      if (!def) {
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'unknown tool', is_error: true });
        continue;
      }
      try {
        const out = await def.handler(tu.input);
        toolCalls.push({ name: tu.name, input: tu.input, output: out });
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out ?? null) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: msg, is_error: true });
      }
    }
    messages.push({ role: 'tool', content: results });
  }

  return {
    finalText: '(agent halted: maxIterations reached)',
    iterations: maxIter,
    toolCalls, usageTotals: totals,
    modelUsed: resp.model ?? model,
    providerUsed: provider.name,
  };
}
