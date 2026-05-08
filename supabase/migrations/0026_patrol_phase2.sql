-- 0026 — Patrol Phase 2: missed-checkpoint detection, photo-required flag,
-- randomized route order helper.
--
-- Builds on 0025 (NFC patrol check-in). Three pieces:
--
--   1. tour_checkpoints.photo_required — when true, record_patrol_scan still
--      accepts the tap, but the response asks the guard to attach a photo
--      before leaving the checkpoint. Enforcement is "softly required" —
--      the scan is recorded either way; absent attachments are visible to
--      supervisors via patrol_overdue_runs and the console.
--
--   2. tour_runs.alerted_overdue_at — set by the missed-checkpoint cron the
--      first time it flags a run as past expected duration without all
--      checkpoints scanned. Idempotent: subsequent cron passes skip runs
--      whose alerted_overdue_at IS NOT NULL.
--
--   3. patrol_overdue_runs() / patrol_record_overdue() — the cron's two
--      RPCs: list runs needing alerts, mark them alerted (and create the
--      notifications). SECURITY DEFINER so the Edge function's service-role
--      JWT can call them without RLS gymnastics.

-- ─── A. Schema additions ────────────────────────────────────────────────────
ALTER TABLE tour_checkpoints
  ADD COLUMN IF NOT EXISTS photo_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tour_runs
  ADD COLUMN IF NOT EXISTS alerted_overdue_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS tour_runs_overdue_idx
  ON tour_runs(org_id, status, started_at) WHERE status = 'in_progress' AND alerted_overdue_at IS NULL;

-- ─── B. Update record_patrol_scan to surface photo_required ─────────────────
-- We CREATE OR REPLACE the same function with the same signature; the only
-- behavior change is the return JSON now includes `photo_required`. Callers
-- that don't read the field continue to work unchanged.

CREATE OR REPLACE FUNCTION public.record_patrol_scan(
  p_code         TEXT,
  p_lat          NUMERIC,
  p_lng          NUMERIC,
  p_accuracy_m   NUMERIC DEFAULT NULL,
  p_scanned_at   TIMESTAMPTZ DEFAULT now(),
  p_note         TEXT DEFAULT NULL,
  p_device_label TEXT DEFAULT NULL,
  p_photo_urls   TEXT[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid               UUID := auth.uid();
  v_user_profile_id   UUID;
  v_org_id            UUID;
  v_role              TEXT;
  v_guard_id          UUID;
  v_checkpoint        tour_checkpoints%ROWTYPE;
  v_route             tour_routes%ROWTYPE;
  v_site_id           UUID;
  v_site_name         TEXT;
  v_shift             shifts%ROWTYPE;
  v_run_id            UUID;
  v_scan_id           UUID;
  v_distance_m        NUMERIC;
  v_window_start      TIMESTAMPTZ;
  v_window_end        TIMESTAMPTZ;
  v_kind              TEXT;
  v_dup_id            UUID;
  v_progress          JSONB;
  v_next_label        TEXT;
  c_window_buffer     INTERVAL := '30 minutes';
  c_dup_window        INTERVAL := '60 seconds';
  c_geo              GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status','rejected','kind','unauthenticated','message','Sign in to check in.');
  END IF;

  SELECT id, org_id, role INTO v_user_profile_id, v_org_id, v_role
    FROM user_profiles WHERE auth_user_id = v_uid LIMIT 1;
  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object('status','rejected','kind','no_profile','message','Your account is not provisioned. Contact dispatch.');
  END IF;

  SELECT g.id INTO v_guard_id FROM guards g
    WHERE g.org_id = v_org_id
      AND (g.user_profile_id = v_user_profile_id
           OR g.email = (SELECT email FROM user_profiles WHERE id = v_user_profile_id))
      AND g.deleted_at IS NULL
    LIMIT 1;

  SELECT * INTO v_checkpoint FROM tour_checkpoints
    WHERE org_id = v_org_id AND checkpoint_code = p_code LIMIT 1;

  IF v_checkpoint.id IS NULL THEN
    INSERT INTO patrol_exceptions(org_id, checkpoint_code, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note, raw)
    VALUES (v_org_id, p_code, v_guard_id, v_user_profile_id,
      'unknown_code', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note,
      jsonb_build_object('lat', p_lat, 'lng', p_lng));
    RETURN jsonb_build_object('status','flagged','kind','unknown_code',
      'message', format('Code %s is not a registered checkpoint.', p_code));
  END IF;

  IF NOT v_checkpoint.is_active THEN
    INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note)
    VALUES (v_org_id, v_checkpoint.id, p_code, v_guard_id, v_user_profile_id,
      'inactive_checkpoint', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note);
    RETURN jsonb_build_object('status','flagged','kind','inactive_checkpoint',
      'message','This checkpoint is currently inactive.');
  END IF;

  SELECT * INTO v_route FROM tour_routes WHERE id = v_checkpoint.route_id;
  v_site_id := v_route.site_id;
  SELECT name INTO v_site_name FROM sites WHERE id = v_site_id;

  IF v_guard_id IS NULL THEN
    INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note)
    VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_user_profile_id,
      'no_guard_record', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note);
    RETURN jsonb_build_object('status','flagged','kind','no_guard_record',
      'message','You are signed in but not registered as a guard. Tell dispatch.');
  END IF;

  SELECT * INTO v_shift FROM shifts
    WHERE org_id = v_org_id AND guard_id = v_guard_id AND site_id = v_site_id
      AND status IN ('in_progress','confirmed','scheduled')
      AND p_scanned_at BETWEEN scheduled_start - c_window_buffer
                           AND scheduled_end   + c_window_buffer
    ORDER BY (status = 'in_progress') DESC, scheduled_start DESC
    LIMIT 1;

  IF v_shift.id IS NULL THEN
    PERFORM 1 FROM shifts
      WHERE org_id = v_org_id AND guard_id = v_guard_id
        AND status IN ('in_progress','confirmed','scheduled')
        AND p_scanned_at BETWEEN scheduled_start - c_window_buffer
                             AND scheduled_end   + c_window_buffer
      LIMIT 1;
    IF FOUND THEN v_kind := 'wrong_site'; ELSE v_kind := 'no_active_shift'; END IF;

    INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note)
    VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_guard_id, v_user_profile_id,
      v_kind, p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note);
    RETURN jsonb_build_object('status','flagged','kind', v_kind,
      'message',
        CASE v_kind
          WHEN 'wrong_site' THEN format('You are not on shift at %s right now.', v_site_name)
          ELSE                   'No active shift found for this site.'
        END);
  END IF;

  v_window_start := v_shift.scheduled_start - c_window_buffer;
  v_window_end   := v_shift.scheduled_end   + c_window_buffer;
  IF p_scanned_at < v_window_start OR p_scanned_at > v_window_end THEN
    INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note)
    VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
      'out_of_window', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note);
    RETURN jsonb_build_object('status','flagged','kind','out_of_window',
      'message','Scan is outside your scheduled shift window.');
  END IF;

  IF v_checkpoint.geo IS NOT NULL THEN
    v_distance_m := ST_Distance(v_checkpoint.geo, c_geo);
    IF p_accuracy_m IS NOT NULL AND p_accuracy_m > v_checkpoint.allowed_radius_m * 2 THEN
      INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
        kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note)
      VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
        'low_gps_accuracy', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note);
      RETURN jsonb_build_object('status','flagged','kind','low_gps_accuracy',
        'message', format('GPS accuracy ±%sm too imprecise for %sm radius. Move to open sky and rescan.',
                          ROUND(p_accuracy_m), v_checkpoint.allowed_radius_m));
    END IF;
    IF v_distance_m > v_checkpoint.allowed_radius_m THEN
      INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
        kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note)
      VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
        'out_of_range', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note);
      RETURN jsonb_build_object('status','flagged','kind','out_of_range',
        'distance_m', ROUND(v_distance_m), 'allowed_radius_m', v_checkpoint.allowed_radius_m,
        'message', format('You are %sm from the checkpoint (allowed %sm). Rescan at the correct point or add a note.',
                          ROUND(v_distance_m), v_checkpoint.allowed_radius_m));
    END IF;
  END IF;

  SELECT ts.id INTO v_dup_id FROM tour_scans ts
    JOIN tour_runs tr ON tr.id = ts.run_id
    WHERE ts.org_id = v_org_id AND ts.checkpoint_id = v_checkpoint.id
      AND tr.shift_id = v_shift.id
      AND ts.scanned_at >= p_scanned_at - c_dup_window
      AND ts.scanned_at <= p_scanned_at + c_dup_window
    LIMIT 1;
  IF v_dup_id IS NOT NULL THEN
    INSERT INTO patrol_exceptions(org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note)
    VALUES (v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
      'duplicate', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note);
    RETURN jsonb_build_object('status','flagged','kind','duplicate','message','Already scanned a moment ago.');
  END IF;

  SELECT id INTO v_run_id FROM tour_runs
    WHERE org_id = v_org_id AND shift_id = v_shift.id AND route_id = v_checkpoint.route_id
      AND status = 'in_progress'
    LIMIT 1;
  IF v_run_id IS NULL THEN
    INSERT INTO tour_runs(org_id, shift_id, route_id, started_at, status)
      VALUES (v_org_id, v_shift.id, v_checkpoint.route_id, p_scanned_at, 'in_progress')
      RETURNING id INTO v_run_id;
  END IF;

  v_scan_id := gen_random_uuid();
  INSERT INTO tour_scans(id, org_id, run_id, checkpoint_id, scanned_at, geo, geo_accuracy_m, notes, photo_urls)
    VALUES (v_scan_id, v_org_id, v_run_id, v_checkpoint.id, p_scanned_at, c_geo, p_accuracy_m, p_note, p_photo_urls);

  WITH route_cps AS (
    SELECT id, label, ordinal FROM tour_checkpoints
      WHERE route_id = v_checkpoint.route_id AND is_active ORDER BY ordinal
  ),
  scanned AS (
    SELECT DISTINCT ts.checkpoint_id FROM tour_scans ts WHERE ts.run_id = v_run_id
  )
  SELECT jsonb_build_object(
    'completed', (SELECT COUNT(*) FROM scanned),
    'total',     (SELECT COUNT(*) FROM route_cps)
  ) INTO v_progress;

  SELECT label INTO v_next_label FROM tour_checkpoints
    WHERE route_id = v_checkpoint.route_id AND is_active
      AND ordinal > v_checkpoint.ordinal
      AND id NOT IN (SELECT checkpoint_id FROM tour_scans WHERE run_id = v_run_id)
    ORDER BY ordinal LIMIT 1;

  IF v_next_label IS NULL AND
     (v_progress->>'completed')::int >= (v_progress->>'total')::int THEN
    UPDATE tour_runs SET status = 'completed', completed_at = p_scanned_at WHERE id = v_run_id;
  END IF;

  RETURN jsonb_build_object(
    'status',           'accepted',
    'message',          'Checkpoint scan recorded',
    'scan_id',          v_scan_id,
    'run_id',           v_run_id,
    'checkpoint_id',    v_checkpoint.id,
    'checkpoint_label', v_checkpoint.label,
    'site_name',        v_site_name,
    'distance_m',       CASE WHEN v_distance_m IS NULL THEN NULL ELSE ROUND(v_distance_m) END,
    'progress',         v_progress,
    'next_checkpoint',  v_next_label,
    'photo_required',   v_checkpoint.photo_required,
    'has_photo',        (p_photo_urls IS NOT NULL AND array_length(p_photo_urls, 1) > 0),
    'scanned_at',       p_scanned_at
  );
END $$;

REVOKE ALL ON FUNCTION public.record_patrol_scan(TEXT,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,TEXT,TEXT,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_patrol_scan(TEXT,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,TEXT,TEXT,TEXT[]) TO authenticated;

-- ─── C. Missed-checkpoint detection ─────────────────────────────────────────
-- patrol_overdue_runs returns runs needing an alert. A run is overdue when:
--   • status = 'in_progress'
--   • started_at + tour_routes.expected_duration_min minutes (defaulted to 90
--     when null) has elapsed
--   • not every active checkpoint on the route has a scan
--   • alerted_overdue_at IS NULL (idempotent — won't double-alert)

CREATE OR REPLACE FUNCTION public.patrol_overdue_runs()
RETURNS TABLE (
  run_id              UUID,
  org_id              UUID,
  site_id             UUID,
  site_name           TEXT,
  route_id            UUID,
  route_name          TEXT,
  shift_id            UUID,
  guard_id            UUID,
  guard_name          TEXT,
  started_at          TIMESTAMPTZ,
  expected_duration_min INT,
  minutes_overdue     NUMERIC,
  total_checkpoints   INT,
  scanned_checkpoints INT,
  missed_checkpoints  INT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH base AS (
    SELECT
      tr.id            AS run_id,
      tr.org_id,
      tr.shift_id,
      tr.route_id,
      tr.started_at,
      r.site_id,
      r.name           AS route_name,
      COALESCE(r.expected_duration_min, 90) AS expected_duration_min,
      EXTRACT(EPOCH FROM (now() - (tr.started_at + (COALESCE(r.expected_duration_min, 90) || ' minutes')::interval))) / 60.0
                       AS minutes_overdue,
      sh.guard_id
    FROM tour_runs tr
    JOIN tour_routes r ON r.id = tr.route_id
    LEFT JOIN shifts sh ON sh.id = tr.shift_id
    WHERE tr.status = 'in_progress'
      AND tr.alerted_overdue_at IS NULL
      AND tr.started_at + (COALESCE(r.expected_duration_min, 90) || ' minutes')::interval < now()
  ),
  counts AS (
    SELECT b.run_id,
      (SELECT COUNT(*)::INT FROM tour_checkpoints tc WHERE tc.route_id = b.route_id AND tc.is_active) AS total,
      (SELECT COUNT(DISTINCT ts.checkpoint_id)::INT FROM tour_scans ts WHERE ts.run_id = b.run_id) AS scanned
    FROM base b
  )
  SELECT
    b.run_id, b.org_id, b.site_id,
    (SELECT name FROM sites WHERE id = b.site_id),
    b.route_id, b.route_name,
    b.shift_id, b.guard_id,
    (SELECT first_name || ' ' || last_name FROM guards WHERE id = b.guard_id),
    b.started_at, b.expected_duration_min,
    ROUND(b.minutes_overdue, 1),
    c.total, c.scanned,
    GREATEST(c.total - c.scanned, 0)
  FROM base b
  JOIN counts c ON c.run_id = b.run_id
  WHERE c.total > 0 AND c.scanned < c.total
$$;

REVOKE ALL ON FUNCTION public.patrol_overdue_runs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patrol_overdue_runs() TO service_role;

-- patrol_record_overdue_alerts marks a batch of runs as alerted in one shot
-- (called by the cron Edge function after it inserts notifications).
CREATE OR REPLACE FUNCTION public.patrol_record_overdue_alerts(p_run_ids UUID[])
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE tour_runs SET alerted_overdue_at = now()
    WHERE id = ANY(p_run_ids) AND alerted_overdue_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.patrol_record_overdue_alerts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patrol_record_overdue_alerts(UUID[]) TO service_role;

-- Tenant-scoped sibling for the console. Same shape as patrol_overdue_runs
-- but filters to current_user_org_id() and includes runs we've already
-- alerted on (the supervisor still wants to see them on the dashboard until
-- the run completes).
CREATE OR REPLACE FUNCTION public.patrol_overdue_runs_for_org()
RETURNS TABLE (
  run_id              UUID,
  site_id             UUID,
  site_name           TEXT,
  route_id            UUID,
  route_name          TEXT,
  shift_id            UUID,
  guard_id            UUID,
  guard_name          TEXT,
  started_at          TIMESTAMPTZ,
  expected_duration_min INT,
  minutes_overdue     NUMERIC,
  total_checkpoints   INT,
  scanned_checkpoints INT,
  missed_checkpoints  INT,
  alerted             BOOLEAN
)
LANGUAGE sql SECURITY INVOKER STABLE SET search_path = public AS $$
  WITH base AS (
    SELECT
      tr.id            AS run_id,
      tr.shift_id, tr.route_id, tr.started_at, tr.alerted_overdue_at,
      r.site_id, r.name AS route_name,
      COALESCE(r.expected_duration_min, 90) AS expected_duration_min,
      EXTRACT(EPOCH FROM (now() - (tr.started_at + (COALESCE(r.expected_duration_min, 90) || ' minutes')::interval))) / 60.0
                       AS minutes_overdue,
      sh.guard_id
    FROM tour_runs tr
    JOIN tour_routes r ON r.id = tr.route_id
    LEFT JOIN shifts sh ON sh.id = tr.shift_id
    WHERE tr.org_id = current_user_org_id()
      AND tr.status = 'in_progress'
      AND tr.started_at + (COALESCE(r.expected_duration_min, 90) || ' minutes')::interval < now()
  ),
  counts AS (
    SELECT b.run_id,
      (SELECT COUNT(*)::INT FROM tour_checkpoints tc WHERE tc.route_id = b.route_id AND tc.is_active) AS total,
      (SELECT COUNT(DISTINCT ts.checkpoint_id)::INT FROM tour_scans ts WHERE ts.run_id = b.run_id) AS scanned
    FROM base b
  )
  SELECT
    b.run_id, b.site_id,
    (SELECT name FROM sites WHERE id = b.site_id),
    b.route_id, b.route_name,
    b.shift_id, b.guard_id,
    (SELECT first_name || ' ' || last_name FROM guards WHERE id = b.guard_id),
    b.started_at, b.expected_duration_min,
    ROUND(b.minutes_overdue, 1),
    c.total, c.scanned,
    GREATEST(c.total - c.scanned, 0),
    (b.alerted_overdue_at IS NOT NULL)
  FROM base b
  JOIN counts c ON c.run_id = b.run_id
  WHERE c.total > 0 AND c.scanned < c.total
  ORDER BY b.minutes_overdue DESC
$$;
GRANT EXECUTE ON FUNCTION public.patrol_overdue_runs_for_org() TO authenticated;

-- ─── D. Cron schedule ───────────────────────────────────────────────────────
-- Run every 15 minutes. The Edge function is cheap when no runs are overdue
-- (single SQL query returns 0 rows → noop). Aligns with the rest of the
-- platform's cron-via-pg_cron-+-pg_net pattern.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stigg-patrol-missed-checkpoints') THEN
      PERFORM cron.unschedule('stigg-patrol-missed-checkpoints');
    END IF;
    PERFORM cron.schedule(
      'stigg-patrol-missed-checkpoints',
      '*/15 * * * *',
      $JOB$
        SELECT net.http_post(
          url := current_setting('app.supabase_url', true) || '/functions/v1/patrol-missed-checkpoints',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer ' || current_setting('app.service_role_key', true)
          ),
          body := '{}'::jsonb
        );
      $JOB$
    );
  END IF;
END $$;
