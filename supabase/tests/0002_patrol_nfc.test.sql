-- pgTAP tests for the NFC patrol check-in flow.
--
-- Each test sets up the smallest scaffolding it needs (org, guard, shift,
-- route, checkpoint) and exercises one validation rule of record_patrol_scan.
-- Asserts:
--   1. happy path → 'accepted', tour_scans inserted, tour_runs lazy-created
--   2. unknown code → flagged, exception row inserted
--   3. out-of-range → flagged with distance_m
--   4. no active shift → flagged
--   5. wrong site → flagged with kind=wrong_site
--   6. duplicate within window → flagged
--   7. cross-org isolation: org-B's code can't be hit by org-A guard
--   8. resolve_patrol_exception 'converted' promotes to a real scan

BEGIN;
SELECT plan(11);

-- ─── Fixtures ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  org_a UUID; org_b UUID;
  user_g_a UUID; user_g_b UUID; user_admin_a UUID;
  guard_a UUID; guard_b UUID;
  client_a UUID; client_b UUID;
  site_a1 UUID; site_a2 UUID; site_b UUID;
  route_a UUID; route_b UUID;
  cp_a1_front UUID; cp_a1_rear UUID; cp_a2_front UUID; cp_b_main UUID;
  shift_a_now UUID; shift_a_other_site UUID;
BEGIN
  INSERT INTO orgs(name, slug) VALUES ('Org A','org-a') RETURNING id INTO org_a;
  INSERT INTO orgs(name, slug) VALUES ('Org B','org-b') RETURNING id INTO org_b;

  INSERT INTO auth.users(id,email) VALUES (gen_random_uuid(), 'guard-a@x.test') RETURNING id INTO user_g_a;
  INSERT INTO auth.users(id,email) VALUES (gen_random_uuid(), 'guard-b@x.test') RETURNING id INTO user_g_b;
  INSERT INTO auth.users(id,email) VALUES (gen_random_uuid(), 'admin-a@x.test') RETURNING id INTO user_admin_a;

  INSERT INTO user_profiles(auth_user_id, org_id, email, role)
    VALUES (user_g_a,    org_a, 'guard-a@x.test', 'guard');
  INSERT INTO user_profiles(auth_user_id, org_id, email, role)
    VALUES (user_g_b,    org_b, 'guard-b@x.test', 'guard');
  INSERT INTO user_profiles(auth_user_id, org_id, email, role)
    VALUES (user_admin_a, org_a, 'admin-a@x.test','supervisor');

  INSERT INTO clients(org_id, name) VALUES (org_a, 'Client A') RETURNING id INTO client_a;
  INSERT INTO clients(org_id, name) VALUES (org_b, 'Client B') RETURNING id INTO client_b;

  -- Two Org A sites; checkpoint geo at (56.7267, -111.3790) to mimic Fort Mac.
  INSERT INTO sites(org_id, client_id, name, geo)
    VALUES (org_a, client_a, 'Northview', ST_SetSRID(ST_MakePoint(-111.379, 56.7267),4326)::geography)
    RETURNING id INTO site_a1;
  INSERT INTO sites(org_id, client_id, name, geo)
    VALUES (org_a, client_a, 'Other Site', ST_SetSRID(ST_MakePoint(-113.4938,53.5461),4326)::geography)
    RETURNING id INTO site_a2;
  INSERT INTO sites(org_id, client_id, name, geo)
    VALUES (org_b, client_b, 'OrgB site', ST_SetSRID(ST_MakePoint(-114.0719,51.0447),4326)::geography)
    RETURNING id INTO site_b;

  INSERT INTO tour_routes(org_id, site_id, name)
    VALUES (org_a, site_a1, 'Northview night route')
    RETURNING id INTO route_a;
  INSERT INTO tour_routes(org_id, site_id, name)
    VALUES (org_b, site_b, 'OrgB route')
    RETURNING id INTO route_b;

  -- Org A: two checkpoints. Front entrance at the site geo, rear ~50m north.
  INSERT INTO tour_checkpoints(org_id, route_id, ordinal, label, scan_method, scan_token,
                               checkpoint_code, allowed_radius_m, geo)
    VALUES (org_a, route_a, 1, 'Front entrance', 'nfc', 'tok-a-front',
            'NW-1001', 50,
            ST_SetSRID(ST_MakePoint(-111.379, 56.7267),4326)::geography)
    RETURNING id INTO cp_a1_front;
  INSERT INTO tour_checkpoints(org_id, route_id, ordinal, label, scan_method, scan_token,
                               checkpoint_code, allowed_radius_m, geo)
    VALUES (org_a, route_a, 2, 'Rear door', 'nfc', 'tok-a-rear',
            'NW-1002', 50,
            -- ~111m north (≈0.001 latitude)
            ST_SetSRID(ST_MakePoint(-111.379, 56.7277),4326)::geography)
    RETURNING id INTO cp_a1_rear;

  -- Org B: a checkpoint with a code that exists ONLY in org B.
  INSERT INTO tour_checkpoints(org_id, route_id, ordinal, label, scan_method, scan_token,
                               checkpoint_code, allowed_radius_m, geo)
    VALUES (org_b, route_b, 1, 'OrgB main', 'nfc', 'tok-b',
            'OB-1', 50,
            ST_SetSRID(ST_MakePoint(-114.0719,51.0447),4326)::geography)
    RETURNING id INTO cp_b_main;

  -- Guards. Org A guard linked to user_profile via email match (the RPC
  -- supports both email and user_profile_id linkage).
  INSERT INTO guards(org_id, first_name, last_name, email, status)
    VALUES (org_a, 'Alex', 'Aubrey', 'guard-a@x.test', 'active')
    RETURNING id INTO guard_a;
  INSERT INTO guards(org_id, first_name, last_name, email, status)
    VALUES (org_b, 'Bree', 'Boudreau', 'guard-b@x.test', 'active')
    RETURNING id INTO guard_b;

  -- A current shift for guard_a at site_a1, and another at site_a2 in case
  -- we need to test wrong_site.
  INSERT INTO shifts(org_id, guard_id, site_id, scheduled_start, scheduled_end, status)
    VALUES (org_a, guard_a, site_a1, now() - INTERVAL '1 hour', now() + INTERVAL '7 hours', 'in_progress')
    RETURNING id INTO shift_a_now;

  PERFORM set_config('test.org_a', org_a::text, false);
  PERFORM set_config('test.org_b', org_b::text, false);
  PERFORM set_config('test.user_g_a', user_g_a::text, false);
  PERFORM set_config('test.user_g_b', user_g_b::text, false);
  PERFORM set_config('test.user_admin_a', user_admin_a::text, false);
  PERFORM set_config('test.guard_a', guard_a::text, false);
  PERFORM set_config('test.shift_a_now', shift_a_now::text, false);
  PERFORM set_config('test.cp_a1_front', cp_a1_front::text, false);
  PERFORM set_config('test.cp_a1_rear',  cp_a1_rear::text,  false);
  PERFORM set_config('test.site_a1', site_a1::text, false);
  PERFORM set_config('test.site_a2', site_a2::text, false);
END $$;

-- Helper to impersonate a user (matches the pattern in 0001_rls.test.sql).
CREATE OR REPLACE FUNCTION test.become(uid UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', uid::text, true); END $$;

-- ─── Tests ──────────────────────────────────────────────────────────────────

-- 1. Happy path: guard_a taps NW-1001 from inside the radius → accepted.
SELECT test.become(current_setting('test.user_g_a')::UUID);
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code       := 'NW-1001',
    p_lat        := 56.7267,
    p_lng        := -111.379,
    p_accuracy_m := 8
  )->>'status'),
  'accepted',
  'happy path: in-radius scan with active shift is accepted'
);

-- A run was lazy-created.
SELECT is(
  (SELECT count(*)::int FROM tour_runs WHERE shift_id = current_setting('test.shift_a_now')::UUID),
  1,
  'tour_run is lazy-created on first scan'
);

-- The scan was inserted.
SELECT is(
  (SELECT count(*)::int FROM tour_scans
     WHERE checkpoint_id = current_setting('test.cp_a1_front')::UUID),
  1,
  'tour_scan inserted for the accepted check-in'
);

-- 2. Unknown code → flagged, exception row inserted.
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'DOES-NOT-EXIST', p_lat := 56.7267, p_lng := -111.379, p_accuracy_m := 8
  )->>'kind'),
  'unknown_code',
  'unknown code is flagged'
);
SELECT is(
  (SELECT count(*)::int FROM patrol_exceptions WHERE kind = 'unknown_code' AND checkpoint_code = 'DOES-NOT-EXIST'),
  1,
  'unknown_code lands in patrol_exceptions'
);

-- 3. Out of range: ~600m east of Front entrance is well outside 50m radius.
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'NW-1002', p_lat := 56.7277, p_lng := -111.370, p_accuracy_m := 5
  )->>'kind'),
  'out_of_range',
  'out-of-range scan is flagged'
);

-- 4. No active shift: terminate the shift and try again.
SELECT test.become(current_setting('test.user_admin_a')::UUID);
UPDATE shifts SET status = 'completed', scheduled_end = now() - INTERVAL '2 hours'
  WHERE id = current_setting('test.shift_a_now')::UUID;
SELECT test.become(current_setting('test.user_g_a')::UUID);
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'NW-1001', p_lat := 56.7267, p_lng := -111.379, p_accuracy_m := 8
  )->>'kind'),
  'no_active_shift',
  'scan with no active shift is flagged'
);

-- 5. Wrong site: schedule guard_a a current shift at site_a2 only, scan NW-1001 at site_a1.
SELECT test.become(current_setting('test.user_admin_a')::UUID);
INSERT INTO shifts(org_id, guard_id, site_id, scheduled_start, scheduled_end, status)
  VALUES (current_setting('test.org_a')::UUID, current_setting('test.guard_a')::UUID,
          current_setting('test.site_a2')::UUID,
          now() - INTERVAL '15 minutes', now() + INTERVAL '4 hours', 'in_progress');
SELECT test.become(current_setting('test.user_g_a')::UUID);
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'NW-1001', p_lat := 56.7267, p_lng := -111.379, p_accuracy_m := 8
  )->>'kind'),
  'wrong_site',
  'scan at a checkpoint outside the shift site is flagged as wrong_site'
);

-- 6. Cross-org isolation: org-A guard tries to use org-B's code.
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'OB-1', p_lat := 51.0447, p_lng := -114.0719, p_accuracy_m := 8
  )->>'kind'),
  'unknown_code',
  'org-B code is invisible to org-A guard (cross-tenant isolation)'
);

-- 7. Duplicate suppression. Re-open a current shift at site_a1 first.
SELECT test.become(current_setting('test.user_admin_a')::UUID);
INSERT INTO shifts(org_id, guard_id, site_id, scheduled_start, scheduled_end, status)
  VALUES (current_setting('test.org_a')::UUID, current_setting('test.guard_a')::UUID,
          current_setting('test.site_a1')::UUID,
          now() - INTERVAL '15 minutes', now() + INTERVAL '4 hours', 'in_progress');
SELECT test.become(current_setting('test.user_g_a')::UUID);
-- First scan succeeds.
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'NW-1002', p_lat := 56.7277, p_lng := -111.379, p_accuracy_m := 6
  )->>'status'),
  'accepted',
  'first NW-1002 scan within radius accepted'
);
-- Same shift, same checkpoint, < 60s later → duplicate.
SELECT is(
  (SELECT public.record_patrol_scan(
    p_code := 'NW-1002', p_lat := 56.7277, p_lng := -111.379, p_accuracy_m := 6
  )->>'kind'),
  'duplicate',
  'second scan within 60s window flagged as duplicate'
);

-- 8. Resolve as supervisor: convert one of the out-of-range exceptions to a real scan.
SELECT test.become(current_setting('test.user_admin_a')::UUID);
SELECT is(
  (SELECT (public.resolve_patrol_exception(
    p_exception_id := (SELECT id FROM patrol_exceptions WHERE kind='out_of_range' LIMIT 1),
    p_decision     := 'converted',
    p_note         := 'Verified via security cam footage'
  ))->>'status'),
  'ok',
  'supervisor can convert a flagged scan to a real tour_scan'
);

SELECT * FROM finish();
ROLLBACK;
