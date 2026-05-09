import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const buildUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const buildAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const PROD_URL  = 'https://snlevbkyjipucmkpkqka.supabase.co';
const PROD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubGV2Ymt5amlwdWNta3BrcWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzEwNzIsImV4cCI6MjA5MzQ0NzA3Mn0.7tGlIzwCy25fv8Zf37CWkV5_6SbEcgrn6vVtf1S0t8A';

const url  = buildUrl  || PROD_URL;
const anon = buildAnon || PROD_ANON;

export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function invokeFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as any });
  if (error) throw error;
  return data as T;
}
