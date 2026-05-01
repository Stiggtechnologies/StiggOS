// Caller authentication. Every edge function:
//   1. Reads the user's JWT from the Authorization header.
//   2. Resolves their user_profile (org_id + role).
//   3. Returns a Supabase client scoped to the *user* (RLS-enforced)
//      AND a service-role client (RLS-bypassing) for tightly-scoped writes.
//
// Service-role usage rules:
//   • Only used to write rows the user couldn't write themselves
//     (e.g. ai_sessions cost telemetry, audit log inserts).
//   • Always set org_id explicitly to the resolved user's org.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface CallerCtx {
  user_id: string;
  org_id: string;
  role: string;
  user: SupabaseClient;
  service: SupabaseClient;
}

export async function authenticate(req: Request): Promise<CallerCtx | Response> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'missing bearer token' }), { status: 401 });
  }
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const sr   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const service = createClient(url, sr, { auth: { persistSession: false } });

  const { data: u, error: ue } = await user.auth.getUser();
  if (ue || !u.user) {
    return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
  }

  const { data: profile, error: pe } = await service
    .from('user_profiles')
    .select('id, org_id, role')
    .eq('auth_user_id', u.user.id)
    .single();

  if (pe || !profile) {
    return new Response(JSON.stringify({ error: 'no profile for user' }), { status: 403 });
  }

  return { user_id: profile.id, org_id: profile.org_id, role: profile.role, user, service };
}
