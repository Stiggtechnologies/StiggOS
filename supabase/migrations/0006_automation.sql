-- ============================================================================
-- Automation layer — camera linkage, vehicle GPS, asset tracking, guard tracks.
--
-- This migration adds the tables for the dispatch-routing engine that does
-- what HikCentral Professional does, but vendor-agnostic and AI-aware:
--   • NVR / camera systems are bridged in via API credentials.
--   • Arming schedules define "when" (time windows, ISO weekdays).
--   • Linkage rules define "what" (event type × severity → action set).
--   • Dispatch routes define "who" (rotating list of human/automated targets).
--   • dispatch_events logs every fan-out for audit + analytics.
--
-- Vehicle and asset tracking are separate — they share patterns but operate
-- on their own ingest paths (Traccar / OsmAnd / FindMy bridge / AirTag relay).
-- ============================================================================

-- ─── Bridged camera systems ─────────────────────────────────────────────────
-- One row per integrated NVR / VMS / HikCentral instance.

CREATE TABLE nvr_systems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id         UUID REFERENCES sites(id) ON DELETE SET NULL,
  vendor          TEXT NOT NULL CHECK (vendor IN ('hikvision','hikcentral','dahua','axis','milestone','generic_onvif','rtsp_only')),
  label           TEXT NOT NULL,
  hostname        TEXT,                      -- LAN/VPN endpoint
  api_port        INT,
  username        TEXT,
  /* Secret material — Supabase Vault in production. We store a reference
     by name; the actual secret is decrypted server-side. */
  secret_ref      TEXT,
  /* HMAC shared secret used by the vendor when posting events to our webhook. */
  webhook_secret  TEXT,
  capabilities    TEXT[] DEFAULT '{}',       -- 'event_push','two_way_audio','relay','ptz','tts'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_heartbeat_at TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON nvr_systems(org_id, site_id) WHERE is_active;
CREATE TRIGGER nvr_systems_set_updated_at BEFORE UPDATE ON nvr_systems
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Each `cameras` row may belong to one bridged NVR (Hikvision channels) or be
-- standalone (cloud-only / RTSP-only). Add the link.
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS nvr_system_id UUID REFERENCES nvr_systems(id) ON DELETE SET NULL;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS channel_no INT;

-- ─── Arming schedules — time windows for active linkage profiles ────────────

CREATE TABLE arming_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  /* JSON spec: { windows: [{ days:[1..7 ISO], start:"HH:MM", end:"HH:MM" }, ...], timezone:"America/Edmonton" } */
  spec            JSONB NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON arming_schedules(org_id) WHERE is_active;
CREATE TRIGGER arming_schedules_set_updated_at BEFORE UPDATE ON arming_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Linkage rules — event class × severity → actions ──────────────────────
-- Each rule applies to one camera or whole site. The dispatch-router picks
-- the most specific rule matching an inbound event, then evaluates its
-- arming schedule and action chain.

CREATE TABLE linkage_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  scope_type      TEXT NOT NULL CHECK (scope_type IN ('camera','site','org')),
  scope_id        UUID,
  /* Which inbound event types this rule matches.
     Hikvision values: 'linecrossing','intrusion','motion','region_entrance',
     'region_exiting','object_removal','unattended_baggage','tamper','PIR'… */
  event_types     TEXT[] NOT NULL,
  /* Optional severity floor: 'low'|'medium'|'high'|'critical' */
  severity_min    TEXT,
  /* Schedule that gates this rule. Null = always armed. */
  arming_schedule_id UUID REFERENCES arming_schedules(id) ON DELETE SET NULL,
  /* Action chain — fanout in order. Each action: { type, target_id?, params } */
  actions         JSONB NOT NULL,
  /* Lower runs first when multiple rules match. */
  priority        INT NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON linkage_rules(org_id, scope_type, scope_id) WHERE is_active;
CREATE TRIGGER linkage_rules_set_updated_at BEFORE UPDATE ON linkage_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Dispatch routes & events ───────────────────────────────────────────────
-- A dispatch_route is a rotating pool of targets (people, monitoring desks,
-- automated systems, police) used by linkage actions of type 'dispatch'.

CREATE TABLE dispatch_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  /* round_robin | escalation | severity_escalation | broadcast */
  strategy        TEXT NOT NULL DEFAULT 'round_robin',
  /* Targets array — each: { kind:'guard'|'desk'|'police'|'webhook',
                             id?, channel:'sms'|'voice'|'push'|'email'|'webhook',
                             address, cooldown_sec?, ack_required? }                */
  targets         JSONB NOT NULL,
  /* For round_robin and escalation, where we are in the rotation. */
  rotation_state  JSONB DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON dispatch_routes(org_id) WHERE is_active;
CREATE TRIGGER dispatch_routes_set_updated_at BEFORE UPDATE ON dispatch_routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE dispatch_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Source linkage
  rule_id         UUID REFERENCES linkage_rules(id) ON DELETE SET NULL,
  route_id        UUID REFERENCES dispatch_routes(id) ON DELETE SET NULL,
  -- What triggered it
  source_kind     TEXT NOT NULL CHECK (source_kind IN ('camera_alert','panic','tour_miss','vehicle_alert','asset_alert','manual')),
  source_id       UUID,
  site_id         UUID REFERENCES sites(id) ON DELETE SET NULL,
  payload         JSONB NOT NULL,
  -- Fan-out
  fired_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  target          JSONB NOT NULL,           -- which target was selected
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','delivered','acknowledged','failed','cancelled','escalated')),
  ack_at          TIMESTAMPTZ,
  ack_by          UUID REFERENCES user_profiles(id),
  /* If escalation chain: the next event id in the chain. */
  escalated_to_id UUID REFERENCES dispatch_events(id) ON DELETE SET NULL,
  notes           TEXT
);
CREATE INDEX ON dispatch_events(org_id, fired_at DESC);
CREATE INDEX ON dispatch_events(source_kind, source_id);
CREATE INDEX ON dispatch_events(status) WHERE status IN ('pending','sent');

-- ─── Vehicle GPS history & alerts ───────────────────────────────────────────

CREATE TABLE vehicle_track_points (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL,
  geo             GEOGRAPHY(Point, 4326) NOT NULL,
  speed_kmh       NUMERIC(6,2),
  heading_deg     NUMERIC(5,2),
  ignition        BOOLEAN,
  source          TEXT NOT NULL DEFAULT 'traccar',  -- 'traccar','osmand','oem','phone'
  raw             JSONB
);
CREATE INDEX ON vehicle_track_points(vehicle_id, recorded_at DESC);
CREATE INDEX ON vehicle_track_points USING GIST(geo);

CREATE TABLE vehicle_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  alert_type      TEXT NOT NULL CHECK (alert_type IN ('speeding','idling','unauthorized_use','geofence_exit','harsh_brake','crash','offline')),
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  geo             GEOGRAPHY(Point, 4326),
  speed_kmh       NUMERIC(6,2),
  details         JSONB,
  triage_status   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (triage_status IN ('pending','acknowledged','dismissed','escalated','resolved'))
);
CREATE INDEX ON vehicle_alerts(org_id, triage_status, detected_at DESC);

-- ─── Guard GPS tracks (mobile patrol) ───────────────────────────────────────
-- A pile of points per shift. Shift summary stats live in shifts; individual
-- pings live here.

CREATE TABLE guard_track_points (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  guard_id        UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo             GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_m      NUMERIC(7,2),
  battery_pct     INT
);
CREATE INDEX ON guard_track_points(shift_id, recorded_at DESC);
CREATE INDEX ON guard_track_points USING GIST(geo);

-- ─── Asset trackers (AirTags / generic BLE / FindMy bridge) ─────────────────

CREATE TABLE asset_trackers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('keys','radio','patrol_kit','lockbox','tablet','vehicle_kit','other')),
  vendor          TEXT NOT NULL CHECK (vendor IN ('airtag','tile','samsung','generic_ble','findmy_bridge')),
  device_serial   TEXT,
  assigned_to     UUID REFERENCES guards(id) ON DELETE SET NULL,
  last_seen_at    TIMESTAMPTZ,
  last_geo        GEOGRAPHY(Point, 4326),
  battery_pct     INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON asset_trackers(org_id, asset_type) WHERE is_active;
CREATE TRIGGER asset_trackers_set_updated_at BEFORE UPDATE ON asset_trackers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE asset_track_pings (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tracker_id      UUID NOT NULL REFERENCES asset_trackers(id) ON DELETE CASCADE,
  reported_at     TIMESTAMPTZ NOT NULL,
  geo             GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_m      NUMERIC(7,2),
  battery_pct     INT,
  source          TEXT,
  raw             JSONB
);
CREATE INDEX ON asset_track_pings(tracker_id, reported_at DESC);

-- ─── Tour scan: photo + abnormal flag (additive — keep existing data) ───────
ALTER TABLE tour_scans ADD COLUMN IF NOT EXISTS abnormal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tour_scans ADD COLUMN IF NOT EXISTS abnormal_reason TEXT;

-- ─── RLS for new tenant tables ──────────────────────────────────────────────
SELECT install_tenant_rls(t) FROM unnest(ARRAY[
  'nvr_systems','arming_schedules','linkage_rules','dispatch_routes','dispatch_events',
  'vehicle_track_points','vehicle_alerts','guard_track_points',
  'asset_trackers','asset_track_pings'
]) AS t;

-- ─── Audit triggers on the high-write meaning tables (skip ping tables —
--     they're append-only telemetry; auditing every GPS ping is overkill).
SELECT install_audit_trigger(t) FROM unnest(ARRAY[
  'nvr_systems','arming_schedules','linkage_rules','dispatch_routes','dispatch_events',
  'vehicle_alerts','asset_trackers'
]) AS t;
