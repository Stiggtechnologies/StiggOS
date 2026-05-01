import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// We do NOT silently fall back to demo mode. If env is missing in production,
// the UI surfaces a clear error and refuses to operate.
export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  // Stub client only used to satisfy types when not configured. Every call rejects.
  : (new Proxy({}, {
      get() {
        return () => Promise.reject(new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'));
      },
    }) as unknown as SupabaseClient);

/** Edge-function caller. Adds the user's bearer token automatically. */
export async function invokeFn<T>(name: string, body: unknown): Promise<T> {
  if (!supabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}
