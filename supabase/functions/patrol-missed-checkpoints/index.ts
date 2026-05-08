// POST /functions/v1/patrol-missed-checkpoints  (service-role only — cron)
//
// Every 15 minutes (per migration 0026): find tour_runs that are past their
// route's expected_duration_min without all checkpoints scanned, fan out
// in-app notifications to operating staff, mark each run alerted so we
// don't double-notify. No-op when no runs are overdue.
//
// The function does no aggregation across orgs in app code — patrol_overdue_runs
// returns one row per run with org_id, and we group inside the loop.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { json, preflight } from '../_shared/cors.ts';

interface OverdueRun {
  run_id: string;
  org_id: string;
  site_id: string;
  site_name: string | null;
  route_id: string;
  route_name: string;
  shift_id: string | null;
  guard_id: string | null;
  guard_name: string | null;
  started_at: string;
  expected_duration_min: number;
  minutes_overdue: number;
  total_checkpoints: number;
  scanned_checkpoints: number;
  missed_checkpoints: number;
}

const ALERT_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'supervisor'];

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  // Cron uses the service_role key as Bearer; same pattern as license-renewal-watcher.
  const auth = req.headers.get('Authorization') ?? '';
  const CRON_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return json(req, 401, { error: 'service-role auth required' });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // 1. Pull every overdue run we haven't alerted on yet.
  const { data: overdue, error } = await sb.rpc('patrol_overdue_runs');
  if (error) return json(req, 500, { error: error.message });
  const runs = (overdue ?? []) as OverdueRun[];
  if (runs.length === 0) return json(req, 200, { alerted_runs: 0, alerted_users: 0 });

  // 2. Cache org → eligible staff lookups so we issue one query per org, not per run.
  const staffByOrg = new Map<string, string[]>();
  for (const r of runs) {
    if (staffByOrg.has(r.org_id)) continue;
    const { data: staff } = await sb.from('user_profiles')
      .select('id').eq('org_id', r.org_id).in('role', ALERT_ROLES);
    staffByOrg.set(r.org_id, (staff ?? []).map((s: any) => s.id));
  }

  // 3. Insert one notification row per (run, staff). Single batch insert.
  const rows: any[] = [];
  for (const r of runs) {
    const staff = staffByOrg.get(r.org_id) ?? [];
    if (staff.length === 0) continue;
    for (const userId of staff) {
      rows.push({
        org_id:  r.org_id,
        user_id: userId,
        channel: 'inapp',
        topic:   'patrol.run_overdue',
        payload: {
          run_id:                r.run_id,
          site_id:               r.site_id,
          site_name:             r.site_name,
          route_id:              r.route_id,
          route_name:            r.route_name,
          guard_id:              r.guard_id,
          guard_name:            r.guard_name,
          started_at:            r.started_at,
          expected_duration_min: r.expected_duration_min,
          minutes_overdue:       r.minutes_overdue,
          missed_checkpoints:    r.missed_checkpoints,
          scanned_checkpoints:   r.scanned_checkpoints,
          total_checkpoints:     r.total_checkpoints,
          severity: r.minutes_overdue > 60 ? 'high' : 'medium',
        },
      });
    }
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { error: ie } = await sb.from('notifications').insert(rows);
    if (ie) return json(req, 500, { error: ie.message });
    inserted = rows.length;
  }

  // 4. Mark every alerted run so we don't repeat next pass.
  const runIds = runs.map((r) => r.run_id);
  const { data: marked, error: me } = await sb.rpc('patrol_record_overdue_alerts', { p_run_ids: runIds });
  if (me) return json(req, 500, { error: me.message });

  return json(req, 200, {
    alerted_runs: marked ?? runs.length,
    alerted_users: inserted,
  });
});
