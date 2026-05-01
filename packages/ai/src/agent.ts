// Agent harness. Provider-agnostic — operates on the normalized
// NormalizedMessage / ToolSpec types. Switching from Claude to GPT-4o to a
// self-hosted Llama is a config change, not a code change.

import { z } from 'zod';
import { getProvider } from './provider.js';
import type { NormalizedMessage, ProviderResponse, ToolSpec } from './providers/types.js';
import { modelFor, costFor, type ModelRole } from './models.js';

export interface ToolDef<I = unknown, O = unknown> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  handler: (input: I, ctx: AgentContext) => Promise<O>;
}

export interface AgentContext {
  orgId: string;
  userId?: string;
  surface: string;
  db?: unknown;
  breadcrumbs: Array<{ at: number; kind: string; data: unknown }>;
}

export type AgentEvent =
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; output: unknown }
  | { type: 'tool_error'; name: string; error: string }
  | { type: 'final'; text: string }
  | { type: 'usage'; usage: ProviderResponse['usage']; cost_usd: number; provider: string; model: string };

export interface AgentRequest {
  surface: string;
  systemStatic: string;
  systemDynamic?: string;
  userMessage: string;
  tools: ToolDef[];
  /** Role-based model selection ('agent' or 'fast'). The provider resolves to a concrete name. */
  model?: ModelRole;
  maxIterations?: number;
  temperature?: number;
  ctx: Omit<AgentContext, 'breadcrumbs'>;
}

export interface AgentResult {
  finalText: string;
  iterations: number;
  events: AgentEvent[];
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost_usd: number };
  provider: string;
}

export type ToolHandler = ToolDef['handler'];

export async function runAgent(req: AgentRequest): Promise<AgentResult> {
  const provider = getProvider();
  const role: ModelRole = req.model ?? 'agent';
  const modelName = modelFor(provider.name, role);
  const events: AgentEvent[] = [];
  const ctx: AgentContext = { ...req.ctx, breadcrumbs: [] };
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost_usd: 0 };

  const tools: ToolSpec[] = req.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJson(t.input) as Record<string, unknown>,
  }));

  const messages: NormalizedMessage[] = [
    { role: 'user', content: [{ type: 'text', text: req.userMessage }] },
  ];

  const maxIter = req.maxIterations ?? 6;

  for (let iter = 1; iter <= maxIter; iter++) {
    const resp = await provider.complete({
      model: modelName,
      system: [
        { text: req.systemStatic, cache: true },
        ...(req.systemDynamic ? [{ text: req.systemDynamic, cache: false }] : []),
      ],
      messages,
      tools: provider.capabilities.tools ? tools : undefined,
      temperature: req.temperature ?? 0.2,
    });

    totals.input      += resp.usage.input_tokens ?? 0;
    totals.output     += resp.usage.output_tokens ?? 0;
    totals.cacheRead  += resp.usage.cache_read_input_tokens ?? 0;
    totals.cacheWrite += resp.usage.cache_creation_input_tokens ?? 0;
    const stepCost = costFor(modelName, resp.usage);
    totals.cost_usd  += stepCost;
    events.push({ type: 'usage', usage: resp.usage, cost_usd: stepCost, provider: provider.name, model: resp.model });

    // Append assistant turn (preserve text + tool_use blocks).
    messages.push({ role: 'assistant', content: resp.content });

    for (const block of resp.content) {
      if (block.type === 'text' && block.text) events.push({ type: 'thinking', text: block.text });
    }

    if (resp.stop_reason !== 'tool_use') {
      const finalText = resp.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text).join('\n').trim();
      events.push({ type: 'final', text: finalText });
      return { finalText, iterations: iter, events, usage: totals, provider: provider.name };
    }

    // Run tool_use blocks; reply with one user message containing tool_results.
    const toolBlocks = resp.content.filter((b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use');

    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = [];
    for (const tu of toolBlocks) {
      events.push({ type: 'tool_call', name: tu.name, input: tu.input });
      const def = req.tools.find((t) => t.name === tu.name);
      if (!def) {
        events.push({ type: 'tool_error', name: tu.name, error: 'unknown tool' });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: 'unknown tool', is_error: true });
        continue;
      }
      try {
        const parsed = def.input.parse(tu.input);
        const out = await def.handler(parsed, ctx);
        events.push({ type: 'tool_result', name: tu.name, output: out });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out ?? null) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        events.push({ type: 'tool_error', name: tu.name, error: msg });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: msg, is_error: true });
      }
    }
    messages.push({ role: 'tool', content: toolResults });
  }

  const finalText = '(agent halted: maxIterations reached)';
  events.push({ type: 'final', text: finalText });
  return { finalText, iterations: maxIter, events, usage: totals, provider: provider.name };
}

// Minimal zod → JSON-Schema. Sufficient for our tool shapes.
function zodToJson(s: z.ZodType<any>): Record<string, unknown> {
  if (s instanceof z.ZodOptional || s instanceof z.ZodNullable || s instanceof z.ZodDefault) {
    return zodToJson((s as any)._def.innerType);
  }
  if (s instanceof z.ZodString)  return { type: 'string', ...(s.description ? { description: s.description } : {}) };
  if (s instanceof z.ZodNumber)  return { type: 'number' };
  if (s instanceof z.ZodBoolean) return { type: 'boolean' };
  if (s instanceof z.ZodEnum)    return { type: 'string', enum: (s as any).options };
  if (s instanceof z.ZodArray)   return { type: 'array', items: zodToJson((s as any)._def.type) };
  if (s instanceof z.ZodObject) {
    const shape = (s as any)._def.shape() as Record<string, z.ZodType<any>>;
    const required: string[] = [];
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = zodToJson(v);
      const optional = v instanceof z.ZodOptional || v instanceof z.ZodDefault;
      if (!optional) required.push(k);
    }
    return { type: 'object', properties, required, additionalProperties: false };
  }
  return { type: 'object', additionalProperties: true };
}
