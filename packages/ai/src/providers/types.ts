// Normalized LLM types. Every provider adapter speaks this shape on the
// inside; the wire format conversions to/from Anthropic / OpenAI / Google /
// open-source are confined to the adapter files.
//
// Why normalize?
//   • The agent harness (and every surface) depends on ONE shape, not on a
//     specific vendor SDK. Swapping providers (or self-hosting Llama / Qwen)
//     is a config change, not a refactor.
//   • Tool calling differs across vendors:
//       - Anthropic: tool_use / tool_result content blocks
//       - OpenAI:   tool_calls on the assistant message + role:'tool' replies
//       - Google:   functionCall / functionResponse parts
//     The normalized form below picks the simplest superset.

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface TextBlock      { type: 'text';        text: string }
export interface ToolUseBlock   { type: 'tool_use';    id: string; name: string; input: unknown }
export interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface NormalizedMessage {
  role: Role;
  content: ContentBlock[];
}

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface SystemBlock {
  text: string;
  /** Hint to providers that support prompt caching (Anthropic, some OpenAI deployments). */
  cache: boolean;
}

export interface ProviderRequest {
  model: string;
  system: SystemBlock[];
  messages: NormalizedMessage[];
  tools?: ToolSpec[];
  max_tokens?: number;
  temperature?: number;
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'error' | string;

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface ProviderResponse {
  /** Concrete model the provider actually used (lets you log A/B vs config). */
  model: string;
  stop_reason: StopReason;
  /** Always one assistant turn — text and/or tool_use blocks. */
  content: Array<TextBlock | ToolUseBlock>;
  usage: Usage;
}

export interface Provider {
  /** Adapter name — 'anthropic' | 'openai' | 'google' | 'openai_compatible' | 'mock'. */
  name: string;
  /** Capabilities surface so the harness can degrade gracefully. */
  capabilities: {
    tools: boolean;
    promptCache: boolean;
    /** Some open-source servers cap this; the harness will respect it. */
    maxToolsPerRequest?: number;
  };
  complete(req: ProviderRequest): Promise<ProviderResponse>;
}
