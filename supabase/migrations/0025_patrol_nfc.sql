-- 0025 — NFC patrol check-in.
--
-- Extends the existing tour_routes / tour_checkpoints / tour_runs / tour_scans
-- model to support tap-to-check-in via NFC (or QR fallback). The NFC tag stores
-- a public URL like https://app.stigg.ca/p/NW-1001. The guard's phone opens
-- that URL, the guard-mobile app captures GPS, and calls record_patrol_scan().
--
-- The RPC enforces every defensible-patrol rule server-side (auth, shift
-- assignment, geofence radius, time window, duplicate suppression). If a rule
-- fails the row lands in patrol_exceptions for supervisor review instead of
-- being silently rejected — flagged scans are evidence too.
--
-- Why server-side validation: the URL on the tag is public and the tag itself
-- can be cloned. GPS + signed-in guard + active shift + radius + time-window
-- is what turns a tap into defensible patrol verification. None of that can
-- live on the client.

-- ─── A. Extend tour_checkpoints ─────────────────────────────────────────────
-- Adds the human-readable code printed on the tag, the radius, and the geo
-- columns the RPC needs to validate proximity. Existing `geo` (POINT) column
-- still holds the canonical location; required_lat/required_lng aren't
-- duplicated — we read straight from `geo`.

ALTER TABLE tour_checkpoints
  ADD COLUMN IF NOT EXISTS checkpoint_code   TEXT,
  ADD COLUMN IF NOT EXISTS allowed_radius_m  INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- One code per tenant. NULL allowed during migration; new rows must set it.
CREATE UNIQUE INDEX IF NOT EXISTS tour_checkpoints_org_code_uniq
  ON tour_checkpoints(org_id, checkpoint_code)
  WHERE checkpoint_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS tour_checkpoints_route_active_idx
  ON tour_checkpoints(route_id, ordinal) WHERE is_active;

DROP TRIGGER IF EXISTS tour_checkpoints_set_updated_at ON tour_checkpoints;
CREATE TRIGGER tour_checkpoints_set_updated_at BEFORE UPDATE ON tour_checkpoints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── B. patrol_exceptions ───────────────────────────────────────────────────
-- Anything that fails validation lands here. We record what was sent (raw),
-- which rule failed (kind), and let a supervisor approve / reject / convert
-- to a real scan. Never silently dropped — the audit trail matters.

CREATE TABLE IF NOT EXISTS patrol_exceptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Best-effort references. Any of these may be NULL if validation failed
  -- before we could resolve them (e.g. unknown code → no checkpoint_id).
  checkpoint_id       UUID REFERENCES tour_checkpoints(id) ON DELETE SET NULL,
  checkpoint_code     TEXT,                          -- preserved verbatim from the tap
  site_id             UUID REFERENCES sites(id)     ON DELETE SET NULL,
  shift_id            UUID REFERENCES shifts(id)    ON DELETE SET NULL,
  guard_id            UUID REFERENCES guards(id)    ON DELETE SET NULL,
  user_profile_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  -- The reason the scan was flagged. Multiple reasons collapse to the most
  -- specific one (e.g. unknown_code wins over no_active_shift).
  kind                TEXT NOT NULL CHECK (kind IN (
    'unknown_code',          -- code not found in this org
    'inactive_checkpoint',   -- checkpoint exists but is_active = false
    'no_active_shift',       -- guard isn't clocked in
    'wrong_site',            -- shift is for a different site than the checkpoint
    'out_of_window',         -- scanned outside the shift's time window
    'out_of_range',          -- GPS too far from checkpoint
    'low_gps_accuracy',      -- accuracy worse than the radius itself
    'duplicate',             -- already scanned this checkpoint very recently
    'no_guard_record',       -- signed-in user isn't a guard in this org
    'other'
  )),
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo                 GEOGRAPHY(Point, 4326),
  geo_accuracy_m      NUMERIC,
  distance_m          NUMERIC,                       -- distance to checkpoint, if known
  device_label        TEXT,
  note                TEXT,
  -- Resolution
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','converted')),
  resolved_by         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,
  -- If a supervisor "approves" a flagged scan, this links to the tour_scan
  -- row that gets created post-hoc.
  promoted_scan_id    UUID REFERENCES tour_scans(id) ON DELETE SET NULL,
  raw                 JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patrol_exceptions_org_status_idx
  ON patrol_exceptions(org_id, status, scanned_at DESC);
CREATE INDEX IF NOT EXISTS patrol_exceptions_checkpoint_idx
  ON patrol_exceptions(checkpoint_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS patrol_exceptions_guard_idx
  ON patrol_exceptions(guard_id, scanned_at DESC);

DROP TRIGGER IF EXISTS patrol_exceptions_set_updated_at ON patrol_exceptions;
CREATE TRIGGER patrol_exceptions_set_updated_at BEFORE UPDATE ON patrol_exceptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tenant isolation. Standard org_id check via RLS, plus an INSERT policy that
-- explicitly allows authenticated users to insert their OWN exceptions even if
-- the broader role-restricted insert helper would deny — guards need to be
-- able to record an out-of-range tap on themselves.
SELECT install_tenant_rls('patrol_exceptions');

DROP POLICY IF EXISTS patrol_exceptions_self_insert ON patrol_exceptions;
CREATE POLICY patrol_exceptions_self_insert ON patrol_exceptions FOR INSERT
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('owner','admin','manager','dispatcher','supervisor','guard')
  );

-- Only supervisor+ can mark a flagged scan resolved.
DROP POLICY IF EXISTS patrol_exceptions_resolver_update ON patrol_exceptions;
CREATE POLICY patrol_exceptions_resolver_update ON patrol_exceptions FOR UPDATE
  USING (org_id = current_user_org_id() AND current_user_role() IN ('owner','admin','manager','supervisor','dispatcher'))
  WITH CHECK (org_id = current_user_org_id());

-- ─── C. tour_runs.shift_id nullable for ad-hoc taps ─────────────────────────
-- A guard can tap a checkpoint between shifts (e.g. arrived early, supervisor
-- spot-check). We let the run row exist without a shift; the RPC fills it in
-- when an active shift is found, or leaves it NULL and routes the scan to
-- patrol_exceptions if the no_active_shift rule says so.
ALTER TABLE tour_runs ALTER COLUMN shift_id DROP NOT NULL;

-- ─── D. record_patrol_scan ─────────────────────────────────────────────────
-- The single entry point for NFC/QR check-ins. SECURITY DEFINER because we
-- need to look up the guard via auth.uid() and write to multiple tables in
-- one transaction; the function itself enforces every authorization rule.

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
  -- Tunables. Could move to per-org settings later.
  c_window_buffer     INTERVAL := '30 minutes';
  c_dup_window        INTERVAL := '60 seconds';
  c_geo              GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'kind',   'unauthenticated',
      'message','Sign in to check in.'
    );
  END IF;

  -- Resolve caller → user_profile → org / role.
  SELECT id, org_id, role
    INTO v_user_profile_id, v_org_id, v_role
    FROM user_profiles WHERE auth_user_id = v_uid LIMIT 1;
  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'status','rejected',
      'kind','no_profile',
      'message','Your account is not provisioned. Contact dispatch.'
    );
  END IF;

  -- Find the guard record. Try user_profile linkage first, then email.
  SELECT g.id INTO v_guard_id FROM guards g
    WHERE g.org_id = v_org_id
      AND (g.user_profile_id = v_user_profile_id
           OR g.email = (SELECT email FROM user_profiles WHERE id = v_user_profile_id))
      AND g.deleted_at IS NULL
    LIMIT 1;

  -- Look up the checkpoint scoped to this org. Codes are tenant-unique.
  SELECT * INTO v_checkpoint FROM tour_checkpoints
    WHERE org_id = v_org_id
      AND checkpoint_code = p_code
    LIMIT 1;

  -- ── Validation 1: unknown / inactive code ─────────────────────────────────
  IF v_checkpoint.id IS NULL THEN
    INSERT INTO patrol_exceptions(
      org_id, checkpoint_code, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note,
      raw
    ) VALUES (
      v_org_id, p_code, v_guard_id, v_user_profile_id,
      'unknown_code', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note,
      jsonb_build_object('lat', p_lat, 'lng', p_lng)
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind','unknown_code',
      'message', format('Code %s is not a registered checkpoint.', p_code)
    );
  END IF;

  IF NOT v_checkpoint.is_active THEN
    INSERT INTO patrol_exceptions(
      org_id, checkpoint_id, checkpoint_code, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note
    ) VALUES (
      v_org_id, v_checkpoint.id, p_code, v_guard_id, v_user_profile_id,
      'inactive_checkpoint', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind','inactive_checkpoint',
      'message','This checkpoint is currently inactive.'
    );
  END IF;

  SELECT * INTO v_route   FROM tour_routes WHERE id = v_checkpoint.route_id;
  v_site_id := v_route.site_id;
  SELECT name INTO v_site_name FROM sites WHERE id = v_site_id;

  -- ── Validation 2: guard record exists ─────────────────────────────────────
  IF v_guard_id IS NULL THEN
    INSERT INTO patrol_exceptions(
      org_id, checkpoint_id, checkpoint_code, site_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note
    ) VALUES (
      v_org_id, v_checkpoint.id, p_code, v_site_id, v_user_profile_id,
      'no_guard_record', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind','no_guard_record',
      'message','You are signed in but not registered as a guard. Tell dispatch.'
    );
  END IF;

  -- ── Validation 3: active or recently-scheduled shift on this site ─────────
  -- Prefer in_progress shifts. Fall back to a scheduled shift whose window
  -- (with buffer) covers `now()`. Cross-site shifts don't count — those land
  -- in `wrong_site`.
  SELECT * INTO v_shift FROM shifts
    WHERE org_id = v_org_id
      AND guard_id = v_guard_id
      AND site_id = v_site_id
      AND status IN ('in_progress','confirmed','scheduled')
      AND p_scanned_at BETWEEN scheduled_start - c_window_buffer
                           AND scheduled_end   + c_window_buffer
    ORDER BY (status = 'in_progress') DESC, scheduled_start DESC
    LIMIT 1;

  IF v_shift.id IS NULL THEN
    -- Disambiguate: do they have *any* shift at *another* site right now?
    PERFORM 1 FROM shifts
      WHERE org_id = v_org_id AND guard_id = v_guard_id
        AND status IN ('in_progress','confirmed','scheduled')
        AND p_scanned_at BETWEEN scheduled_start - c_window_buffer
                             AND scheduled_end   + c_window_buffer
      LIMIT 1;
    IF FOUND THEN v_kind := 'wrong_site'; ELSE v_kind := 'no_active_shift'; END IF;

    INSERT INTO patrol_exceptions(
      org_id, checkpoint_id, checkpoint_code, site_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note
    ) VALUES (
      v_org_id, v_checkpoint.id, p_code, v_site_id, v_guard_id, v_user_profile_id,
      v_kind, p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind', v_kind,
      'message',
        CASE v_kind
          WHEN 'wrong_site'       THEN format('You are not on shift at %s right now.', v_site_name)
          ELSE                         'No active shift found for this site.'
        END
    );
  END IF;

  -- ── Validation 4: time-window vs the matched shift ────────────────────────
  v_window_start := v_shift.scheduled_start - c_window_buffer;
  v_window_end   := v_shift.scheduled_end   + c_window_buffer;
  IF p_scanned_at < v_window_start OR p_scanned_at > v_window_end THEN
    INSERT INTO patrol_exceptions(
      org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, device_label, note
    ) VALUES (
      v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
      'out_of_window', p_scanned_at, c_geo, p_accuracy_m, p_device_label, p_note
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind','out_of_window',
      'message','Scan is outside your scheduled shift window.'
    );
  END IF;

  -- ── Validation 5: GPS radius ──────────────────────────────────────────────
  IF v_checkpoint.geo IS NOT NULL THEN
    v_distance_m := ST_Distance(v_checkpoint.geo, c_geo);
    -- If accuracy is wider than the radius, we can't trust the fix.
    IF p_accuracy_m IS NOT NULL AND p_accuracy_m > v_checkpoint.allowed_radius_m * 2 THEN
      INSERT INTO patrol_exceptions(
        org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
        kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note
      ) VALUES (
        v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
        'low_gps_accuracy', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note
      );
      RETURN jsonb_build_object(
        'status','flagged',
        'kind','low_gps_accuracy',
        'message', format('GPS accuracy ±%sm too imprecise for %sm radius. Move to open sky and rescan.',
                          ROUND(p_accuracy_m), v_checkpoint.allowed_radius_m)
      );
    END IF;

    IF v_distance_m > v_checkpoint.allowed_radius_m THEN
      INSERT INTO patrol_exceptions(
        org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
        kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note
      ) VALUES (
        v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
        'out_of_range', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note
      );
      RETURN jsonb_build_object(
        'status','flagged',
        'kind','out_of_range',
        'distance_m', ROUND(v_distance_m),
        'allowed_radius_m', v_checkpoint.allowed_radius_m,
        'message', format('You are %sm from the checkpoint (allowed %sm). Rescan at the correct point or add a note.',
                          ROUND(v_distance_m), v_checkpoint.allowed_radius_m)
      );
    END IF;
  END IF;

  -- ── Validation 6: duplicate suppression ───────────────────────────────────
  -- Prevent a guard double-tapping the same tag from registering twice.
  SELECT ts.id INTO v_dup_id FROM tour_scans ts
    JOIN tour_runs tr ON tr.id = ts.run_id
    WHERE ts.org_id = v_org_id
      AND ts.checkpoint_id = v_checkpoint.id
      AND tr.shift_id = v_shift.id
      AND ts.scanned_at >= p_scanned_at - c_dup_window
      AND ts.scanned_at <= p_scanned_at + c_dup_window
    LIMIT 1;
  IF v_dup_id IS NOT NULL THEN
    INSERT INTO patrol_exceptions(
      org_id, checkpoint_id, checkpoint_code, site_id, shift_id, guard_id, user_profile_id,
      kind, scanned_at, geo, geo_accuracy_m, distance_m, device_label, note
    ) VALUES (
      v_org_id, v_checkpoint.id, p_code, v_site_id, v_shift.id, v_guard_id, v_user_profile_id,
      'duplicate', p_scanned_at, c_geo, p_accuracy_m, v_distance_m, p_device_label, p_note
    );
    RETURN jsonb_build_object(
      'status','flagged',
      'kind','duplicate',
      'message','Already scanned a moment ago.'
    );
  END IF;

  -- ── All validations passed. Find or create the run, then insert the scan. ─
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
  INSERT INTO tour_scans(
    id, org_id, run_id, checkpoint_id, scanned_at, geo, geo_accuracy_m, notes, photo_urls
  ) VALUES (
    v_scan_id, v_org_id, v_run_id, v_checkpoint.id, p_scanned_at, c_geo, p_accuracy_m, p_note, p_photo_urls
  );

  -- Build progress + next-checkpoint hints for the UI.
  WITH route_cps AS (
    SELECT id, label, ordinal FROM tour_checkpoints
      WHERE route_id = v_checkpoint.route_id AND is_active
      ORDER BY ordinal
  ),
  scanned AS (
    SELECT DISTINCT ts.checkpoint_id FROM tour_scans ts
      WHERE ts.run_id = v_run_id
  )
  SELECT jsonb_build_object(
    'completed', (SELECT COUNT(*) FROM scanned),
    'total',     (SELECT COUNT(*) FROM route_cps)
  ) INTO v_progress;

  SELECT label INTO v_next_label FROM tour_checkpoints
    WHERE route_id = v_checkpoint.route_id AND is_active
      AND ordinal > v_checkpoint.ordinal
      AND id NOT IN (SELECT checkpoint_id FROM tour_scans WHERE run_id = v_run_id)
    ORDER BY ordinal
    LIMIT 1;

  -- If we just hit the last unscanned checkpoint, mark the run completed.
  IF v_next_label IS NULL AND
     (v_progress->>'completed')::int >= (v_progress->>'total')::int THEN
    UPDATE tour_runs SET status = 'completed', completed_at = p_scanned_at
      WHERE id = v_run_id;
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
    'scanned_at',       p_scanned_at
  );
END $$;

-- The function uses SECURITY DEFINER so revoke broad access first, then grant
-- only to authenticated roles.
REVOKE ALL ON FUNCTION public.record_patrol_scan(TEXT,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,TEXT,TEXT,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_patrol_scan(TEXT,NUMERIC,NUMERIC,NUMERIC,TIMESTAMPTZ,TEXT,TEXT,TEXT[]) TO authenticated;

-- ─── E. Supervisor RPCs: list pending exceptions, resolve one ──────────────
CREATE OR REPLACE FUNCTION public.patrol_exceptions_pending(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id              UUID,
  scanned_at      TIMESTAMPTZ,
  kind            TEXT,
  status          TEXT,
  checkpoint_code TEXT,
  checkpoint_label TEXT,
  site_id         UUID,
  site_name       TEXT,
  guard_id        UUID,
  guard_name      TEXT,
  distance_m      NUMERIC,
  geo_accuracy_m  NUMERIC,
  note            TEXT
)
LANGUAGE sql SECURITY INVOKER STABLE SET search_path = public AS $$
  SELECT pe.id, pe.scanned_at, pe.kind, pe.status,
         pe.checkpoint_code, tc.label,
         pe.site_id, s.name,
         pe.guard_id, COALESCE(g.first_name || ' ' || g.last_name, NULL),
         pe.distance_m, pe.geo_accuracy_m, pe.note
  FROM patrol_exceptions pe
  LEFT JOIN tour_checkpoints tc ON tc.id = pe.checkpoint_id
  LEFT JOIN sites s             ON s.id  = pe.site_id
  LEFT JOIN guards g            ON g.id  = pe.guard_id
  WHERE pe.org_id = current_user_org_id()
    AND pe.status = 'pending'
  ORDER BY pe.scanned_at DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.patrol_exceptions_pending(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_patrol_exception(
  p_exception_id UUID,
  p_decision     TEXT,                -- 'approved' | 'rejected' | 'converted'
  p_note         TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_org_id  UUID;
  v_role    TEXT;
  v_user_profile_id UUID;
  v_ex      patrol_exceptions%ROWTYPE;
  v_run_id  UUID;
  v_scan_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status','rejected','message','Sign in.');
  END IF;
  SELECT id, org_id, role INTO v_user_profile_id, v_org_id, v_role
    FROM user_profiles WHERE auth_user_id = v_uid LIMIT 1;
  IF v_role NOT IN ('owner','admin','manager','supervisor','dispatcher') THEN
    RETURN jsonb_build_object('status','rejected','message','Not authorized.');
  END IF;
  IF p_decision NOT IN ('approved','rejected','converted') THEN
    RETURN jsonb_build_object('status','rejected','message','Invalid decision.');
  END IF;

  SELECT * INTO v_ex FROM patrol_exceptions WHERE id = p_exception_id AND org_id = v_org_id;
  IF v_ex.id IS NULL THEN
    RETURN jsonb_build_object('status','rejected','message','Exception not found.');
  END IF;
  IF v_ex.status <> 'pending' THEN
    RETURN jsonb_build_object('status','rejected','message','Already resolved.');
  END IF;

  -- 'converted' = supervisor agrees the scan is real, promote it to tour_scans.
  IF p_decision = 'converted' THEN
    IF v_ex.checkpoint_id IS NULL OR v_ex.shift_id IS NULL THEN
      RETURN jsonb_build_object('status','rejected','message','Cannot convert: missing checkpoint or shift.');
    END IF;
    SELECT id INTO v_run_id FROM tour_runs
      WHERE org_id = v_org_id AND shift_id = v_ex.shift_id
        AND route_id = (SELECT route_id FROM tour_checkpoints WHERE id = v_ex.checkpoint_id)
      ORDER BY started_at DESC LIMIT 1;
    IF v_run_id IS NULL THEN
      INSERT INTO tour_runs(org_id, shift_id, route_id, started_at, status)
        VALUES (v_org_id, v_ex.shift_id,
                (SELECT route_id FROM tour_checkpoints WHERE id = v_ex.checkpoint_id),
                v_ex.scanned_at, 'in_progress')
        RETURNING id INTO v_run_id;
    END IF;
    v_scan_id := gen_random_uuid();
    INSERT INTO tour_scans(id, org_id, run_id, checkpoint_id, scanned_at, geo, geo_accuracy_m, notes)
      VALUES (v_scan_id, v_org_id, v_run_id, v_ex.checkpoint_id, v_ex.scanned_at, v_ex.geo, v_ex.geo_accuracy_m,
              COALESCE(v_ex.note,'') || E'\n[supervisor approved exception ' || v_ex.kind || ']');
    UPDATE patrol_exceptions
      SET status='converted', resolved_by = v_user_profile_id, resolved_at = now(),
          resolution_note = p_note, promoted_scan_id = v_scan_id
      WHERE id = v_ex.id;
    RETURN jsonb_build_object('status','ok','scan_id', v_scan_id);
  ELSE
    UPDATE patrol_exceptions
      SET status = p_decision, resolved_by = v_user_profile_id, resolved_at = now(),
          resolution_note = p_note
      WHERE id = v_ex.id;
    RETURN jsonb_build_object('status','ok');
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.resolve_patrol_exception(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_patrol_exception(UUID,TEXT,TEXT) TO authenticated;
