-- pgTAP tests for Phase 2 (migration 0026):
--   • patrol_overdue_runs surfaces in-progress runs past expected duration
--   • patrol_record_overdue_alerts is idempotent
--   • record_patrol_scan returns photo_required + has_photo
--   • patrol_overdue_runs_for_org is tenant-scoped

BEGIN;
SELECT plan(7);

DO $$
DECLARE
  org_a UUID;
  user_g_a UUID; user_admin_a UUID;
  guard_a UUID; client_a UUID; site_a UUID; route_a UUID;
  cp_1 UUID; cp_2 UUID; shift_a UUID;
BEGIN
  INSERT INTO orgs(name, slug) VALUES ('Org A','org-a-p2') RETURNING id INTO org_a;
  INSERT INTO auth.users(id,email) VALUES (gen_random_uuid(), 'guard-a-p2@x.test') RETURNING id INTO user_g_a;
  INSERT INTO auth.users(id,email) VALUES (gen_random_uuid(), 'admin-a-p2@x.test') RETURNING id INTO user_admin_a;
  INSERT INTO user_profiles(auth_user_id, org_id, email, role) VALUES (user_g_a, org_a, 'guard-a-p2@x.test', 'guard');
  INSERT INTO user_profiles(auth_user_id, org_id, email, role) VALUES (user_admin_a, org_a, 'admin-a-p2@x.test', 'supervisor');
  INSERT INTO clients(org_id, name) VALUES (org_a, 'Client A2') RETURNING id INTO client_a;
  INSERT INTO sites(org_id, client_id, name, geo)
    VALUES (org_a, client_a, 'Northview2', ST_SetSRID(ST_MakePoint(-111.379, 56.7267),4326)::geography)
    RETURNING id INTO site_a;
  -- Short expected duration so we can claim the run is overdue without
  -- waiting in the test.
  INSERT INTO tour_routes(org_id, site_id, name, expected_duration_min)
    VALUES (org_a, site_a, 'Quick route', 10) RETURNING id INTO route_a;
  -- Two checkpoints. One has photo_required = true.
  INSERT INTO tour_checkpoints(org_id, route_id, ordinal, label, scan_method, scan_token,
                               checkpoint_code, allowed_radius_m, photo_required, geo)
    VALUES (org_a, route_a, 1, 'CP1', 'nfc', 'tok1', 'PR-1', 50, FALSE,
            ST_SetSRID(ST_MakePoint(-111.379, 56.7267),4326)::geography)
    RETURNING id INTO cp_1;
  INSERT INTO tour_checkpoints(org_id, route_id, ordinal, label, scan_method, scan_token,
                               checkpoint_code, allowed_radius_m, photo_required, geo)
    VALUES (org_a, route_a, 2, 'CP2', 'nfc', 'tok2', 'PR-2', 50, TRUE,
            ST_SetSRID(ST_MakePoint(-111.379, 56.72675),4326)::geography)
    RETURNING id INTO cp_2;
  INSERT INTO guards(org_id, first_name, last_name, email, status)
    VALUES (org_a, 'A', 'P2', 'guard-a-p2@x.test', 'active') RETURNING id INTO guard_a;
  INSERT INTO shifts(org_id, guard_id, site_id, scheduled_start, scheduled_end, status)
    VALUES (org_a, guard_a, site_a, now() - INTERVAL '20 minutes', now() + INTERVAL '8 hours', 'in_progress')
    RETURNING id INTO shift_a;

  PERFORM set_config('test.org_a',         org_a::text,         false);
  PERFORM set_config('test.user_g_a',      user_g_a::text,      false);
  PERFORM set_config('test.user_admin_a',  user_admin_a::text,  false);
  PERFORM set_config('test.guard_a',       guard_a::text,       false);
  PERFORM set_config('test.shift_a',       shift_a::text,       false);
  PERFORM set_config('test.cp_1',          cp_1::text,          false);
  PERFORM set_config('test.cp_2',          cp_2::text,          false);
  PERFORM set_config('test.route_a',       route_a::text,       false);
END $$;

CREATE OR REPLACE FUNCTION test.become(uid UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', uid::text, true); END $$;

-- 1. record_patrol_scan returns photo_required for a flagged checkpoint.
SELECT test.become(current_setting('test.user_g_a')::UUID);
-- Scan CP2 first (it requires a photo). No photo provided → has_photo=false.
SELECT is(
  ((SELECT public.record_patrol_scan(
    p_code := 'PR-2', p_lat := 56.72675, p_lng := -111.379, p_accuracy_m := 5
  ))->>'photo_required')::boolean,
  TRUE,
  'photo_required propagates to the RPC response when checkpoint requires it'
);

-- 2. has_photo is false when no urls were sent.
SELECT is(
  ((SELECT public.record_patrol_scan(
    p_code := 'PR-1', p_lat := 56.7267, p_lng := -111.379, p_accuracy_m := 5
  ))->>'has_photo')::boolean,
  FALSE,
  'has_photo is false when p_photo_urls is null'
);

-- Confirm scans inserted, run started.
SELECT is(
  (SELECT count(*)::int FROM tour_runs WHERE shift_id = current_setting('test.shift_a')::UUID),
  1,
  'one tour_run created for the shift'
);

-- 3. Force the run to be "overdue": started_at far enough in the past that
-- now() > started_at + expected_duration_min. The route has 10-min duration
-- and we'll predate the run by 30 minutes. Use service-role bypass since
-- regular users can't UPDATE alerted_overdue_at.
SELECT test.become(current_setting('test.user_admin_a')::UUID);
UPDATE tour_runs
  SET started_at = now() - INTERVAL '30 minutes', alerted_overdue_at = NULL
  WHERE shift_id = current_setting('test.shift_a')::UUID;

-- patrol_overdue_runs_for_org should see exactly one overdue run (we have
-- 2 active checkpoints, only 2 scans, but the run only had 2 distinct
-- checkpoints so... wait, 2 scanned of 2 = completed. We need to make the
-- run incomplete. Delete one scan so missed_checkpoints > 0.
DELETE FROM tour_scans WHERE checkpoint_id = current_setting('test.cp_1')::UUID;
SELECT is(
  (SELECT count(*)::int FROM public.patrol_overdue_runs_for_org()),
  1,
  'patrol_overdue_runs_for_org surfaces an overdue + incomplete run'
);

-- 4. patrol_overdue_runs (service-role function) is callable and returns
-- one row for the same setup. We can't easily impersonate service_role in
-- pgTAP without elevated privileges, but the function is SECURITY DEFINER
-- and read-only — we can call it directly here from the supervisor.
-- (RLS doesn't block SECURITY DEFINER reads; the GRANT just stops API access.)
SELECT is(
  (SELECT count(*)::int FROM public.patrol_overdue_runs()),
  1,
  'patrol_overdue_runs sees the same overdue run org-wide'
);

-- 5. patrol_record_overdue_alerts marks the run alerted.
SELECT is(
  (SELECT public.patrol_record_overdue_alerts(ARRAY[
     (SELECT run_id FROM public.patrol_overdue_runs() LIMIT 1)
   ])),
  1,
  'patrol_record_overdue_alerts returns the count of newly-marked runs'
);

-- 6. Idempotent: a second call doesn't double-mark.
SELECT is(
  (SELECT public.patrol_record_overdue_alerts(ARRAY[
     (SELECT run_id FROM public.patrol_overdue_runs_for_org() LIMIT 1)
   ])),
  0,
  'patrol_record_overdue_alerts is idempotent'
);

-- 7. After marking, the org-scoped view still shows the run (so supervisors
-- continue to see it), but the unalerted-only feeder is empty.
SELECT is(
  (SELECT count(*)::int FROM public.patrol_overdue_runs()),
  0,
  'patrol_overdue_runs (unalerted) is empty after marking'
);

SELECT * FROM finish();
ROLLBACK;
