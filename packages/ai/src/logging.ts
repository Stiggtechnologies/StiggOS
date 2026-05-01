// Session/message logging helpers. The shape matches the ai_sessions /
// ai_messages tables so callers can persist runs straight from the harness.
// We don't take a hard dependency on supabase here — caller passes a writer.

export interface SessionWriter {
  insertSession(row: {
    org_id: string;
    user_id?: string;
    surface: string;
    model: string;
    status: 'active' | 'completed' | 'aborted' | 'error';
  }): Promise<{ id: string }>;
  finalizeSession(id: string, patch: {
    status: 'completed' | 'aborted' | 'error';
    total_input_tokens: number;
    total_output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    cost_cad: number;
  }): Promise<void>;
  insertMessage(row: {
    org_id: string;
    session_id: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: unknown;
    tool_name?: string;
    tool_use_id?: string;
  }): Promise<void>;
}

export async function logSession(
  w: SessionWriter,
  args: { org_id: string; user_id?: string; surface: string; model: string },
): Promise<{ id: string }> {
  return w.insertSession({ ...args, status: 'active' });
}

export async function logMessage(
  w: SessionWriter,
  args: {
    org_id: string;
    session_id: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: unknown;
    tool_name?: string;
    tool_use_id?: string;
  },
): Promise<void> {
  return w.insertMessage(args);
}
