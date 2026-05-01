import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseConfigured = Boolean(url && anon);
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anon!)
  : (new Proxy({}, { get() { return () => Promise.reject(new Error('Supabase not configured')); } }) as unknown as SupabaseClient);
