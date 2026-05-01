-- ============================================================================
-- StiggOS — Foundation Schema
-- Multi-tenant, multi-region, multi-service-line. Built for Alberta first;
-- province-agnostic so additional regions plug in via the compliance package.
--
-- Conventions:
--   • every tenant-scoped table has org_id with ON DELETE CASCADE
--   • every table has created_at/updated_at; updated_at maintained by trigger
--   • RLS is ENABLED on every tenant-scoped table; policies live in 0002_rls.sql
--   • soft delete via deleted_at (NULL = live)
--   • audit_log records every write via trigger (0003_audit.sql)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";       -- geofencing, route ops
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy search

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Orgs (tenants) ─────────────────────────────────────────────────────────

CREATE TABLE orgs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  legal_name   TEXT,
  region       TEXT NOT NULL DEFAULT 'AB' CHECK (region IN ('AB','BC','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU')),
  timezone     TEXT NOT NULL DEFAULT 'America/Edmonton',
  ssia_license TEXT,                 -- Alberta Security Services & Investigators Act
  wcb_number   TEXT,
  gst_number   TEXT,
  hq_address   JSONB,
  contact      JSONB DEFAULT '{}'::jsonb,
  branding     JSONB DEFAULT '{}'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  service_lines TEXT[] NOT NULL DEFAULT ARRAY['guarding','surveillance','virtual_guard','it_security','secure_transport'],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE TRIGGER orgs_set_updated_at BEFORE UPDATE ON orgs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── User profiles ──────────────────────────────────────────────────────────
-- Linked 1:1 to auth.users.

CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  -- Roles map to RLS policies. Keep this list short and explicit.
  role            TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner','admin','manager','dispatcher','supervisor','guard','it_tech','transport_officer','client','viewer')),
  -- For role='client', binds the user to one external client account.
  client_id       UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  preferences     JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON user_profiles(org_id, role) WHERE is_active;
CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Convenience function used everywhere by RLS:
CREATE OR REPLACE FUNCTION current_user_org_id() RETURNS UUID AS $$
  SELECT org_id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_client_id() RETURNS UUID AS $$
  SELECT client_id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─── Clients (customer accounts) ────────────────────────────────────────────
-- One client may consume multiple service lines.

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  account_number  TEXT,
  name            TEXT NOT NULL,
  legal_name      TEXT,
  industry        TEXT,
  tier            TEXT CHECK (tier IN ('Essential','Enhanced','Premium','Enterprise')),
  status          TEXT NOT NULL DEFAULT 'prospect'
                  CHECK (status IN ('prospect','active','paused','churned')),
  -- Service lines this client consumes (subset of org.service_lines)
  service_lines   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  primary_contact JSONB,
  billing         JSONB DEFAULT '{}'::jsonb,
  portal_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  health_score    NUMERIC(5,2),                  -- AI-maintained
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX ON clients(org_id, status) WHERE deleted_at IS NULL;
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ─── Partners / Subcontractors ──────────────────────────────────────────────
-- Indigenous JV partners (Mikisew, Fort McKay) and subcontracted operators.

CREATE TABLE partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  partner_type    TEXT NOT NULL CHECK (partner_type IN ('indigenous_jv','subcontractor','vendor','referral')),
  contact         JSONB,
  contract_terms  JSONB DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER partners_set_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Sites (physical locations) ─────────────────────────────────────────────

CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         JSONB,
  city            TEXT,
  region          TEXT,
  postal_code     TEXT,
  geo             GEOGRAPHY(Point, 4326),
  geofence        GEOGRAPHY(Polygon, 4326),
  geofence_radius_m INT,                  -- fallback for circular fence
  site_type       TEXT NOT NULL DEFAULT 'commercial'
                  CHECK (site_type IN ('residential','commercial','industrial','oil_gas','construction','retail','healthcare','hospitality','government','education','remote','other')),
  remote          BOOLEAN NOT NULL DEFAULT FALSE,        -- triggers satellite fallback for guards
  hazards         TEXT[] DEFAULT '{}',                   -- 'cold_weather','wildlife','high_voltage','confined_space',…
  service_lines   TEXT[] NOT NULL DEFAULT ARRAY['guarding'],
  metadata        JSONB DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX ON sites USING GIST(geo);
CREATE INDEX ON sites(org_id, client_id) WHERE is_active;
CREATE TRIGGER sites_set_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Post Orders (instructions per site)
CREATE TABLE post_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  version         INT NOT NULL DEFAULT 1,
  effective_from  DATE NOT NULL DEFAULT current_date,
  body_md         TEXT NOT NULL,                  -- markdown source of truth
  body_embedding  VECTOR(1536),                   -- for RAG / forensic search
  authored_by     UUID REFERENCES user_profiles(id),
  approved_by     UUID REFERENCES user_profiles(id),
  is_current      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON post_orders(site_id, is_current);
CREATE TRIGGER post_orders_set_updated_at BEFORE UPDATE ON post_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Guards ─────────────────────────────────────────────────────────────────

CREATE TABLE guards (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_profile_id          UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  partner_id               UUID REFERENCES partners(id) ON DELETE SET NULL,
  employee_number          TEXT,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT,
  date_of_birth            DATE,
  hire_date                DATE,
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','inactive','on_leave','terminated','probation')),
  employment_type          TEXT NOT NULL DEFAULT 'hourly'
                           CHECK (employment_type IN ('hourly','salary','contractor')),
  hourly_rate              NUMERIC(10,2),
  -- Alberta-issued license under SSIA. The compliance engine validates renewal.
  ssia_license_number      TEXT,
  ssia_license_expiry      DATE,
  first_aid_expiry         DATE,
  drivers_license_class    TEXT,                  -- needed for mobile patrol & secure transport
  drivers_license_expiry   DATE,
  certifications           JSONB DEFAULT '[]'::jsonb,  -- [{type,issuer,number,expiry}]
  emergency_contact        JSONB,
  fatigue_score            NUMERIC(5,2),          -- AI-maintained
  preferences              JSONB DEFAULT '{}'::jsonb,  -- shift prefs, max OT, sites
  base_geo                 GEOGRAPHY(Point, 4326),     -- home for commute scoring
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);
CREATE INDEX ON guards(org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ON guards(ssia_license_expiry) WHERE deleted_at IS NULL;
CREATE TRIGGER guards_set_updated_at BEFORE UPDATE ON guards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Shifts & Time tracking ─────────────────────────────────────────────────

CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  guard_id        UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end   TIMESTAMPTZ NOT NULL,
  shift_type      TEXT NOT NULL DEFAULT 'standard'
                  CHECK (shift_type IN ('standard','overnight','split','on_call','event')),
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','confirmed','in_progress','completed','no_show','cancelled')),
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  -- captured at clock-in/out
  clock_in_geo    GEOGRAPHY(Point, 4326),
  clock_out_geo   GEOGRAPHY(Point, 4326),
  geofence_ok     BOOLEAN,
  hours_worked    NUMERIC(8,2),
  overtime_hours  NUMERIC(8,2) DEFAULT 0,
  bill_rate       NUMERIC(10,2),
  pay_rate        NUMERIC(10,2),
  notes           TEXT,
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON shifts(org_id, scheduled_start);
CREATE INDEX ON shifts(guard_id, scheduled_start);
CREATE INDEX ON shifts(site_id, status);
CREATE TRIGGER shifts_set_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Lone-worker check-ins (mandatory periodic ping for remote sites)
CREATE TABLE lone_worker_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  guard_id        UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  due_at          TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','ok','late','missed','escalated')),
  geo             GEOGRAPHY(Point, 4326),
  channel         TEXT,           -- 'app','sms','satellite','voice'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON lone_worker_checkins(due_at) WHERE status = 'pending';

-- ─── Patrols & Tours ────────────────────────────────────────────────────────

CREATE TABLE tour_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  expected_duration_min INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tour_routes_set_updated_at BEFORE UPDATE ON tour_routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tour_checkpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  route_id        UUID NOT NULL REFERENCES tour_routes(id) ON DELETE CASCADE,
  ordinal         INT NOT NULL,
  label           TEXT NOT NULL,
  geo             GEOGRAPHY(Point, 4326),
  scan_method     TEXT NOT NULL DEFAULT 'qr' CHECK (scan_method IN ('qr','nfc','geo','manual')),
  scan_token      TEXT
);

CREATE TABLE tour_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  route_id        UUID NOT NULL REFERENCES tour_routes(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress','completed','aborted','partial'))
);

CREATE TABLE tour_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  run_id          UUID NOT NULL REFERENCES tour_runs(id) ON DELETE CASCADE,
  checkpoint_id   UUID NOT NULL REFERENCES tour_checkpoints(id) ON DELETE CASCADE,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo             GEOGRAPHY(Point, 4326),
  geo_accuracy_m  NUMERIC,
  notes           TEXT,
  photo_urls      TEXT[]
);
CREATE INDEX ON tour_scans(run_id, scanned_at);

-- ─── Incidents ──────────────────────────────────────────────────────────────

CREATE TABLE incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id               UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  reported_by_guard_id  UUID REFERENCES guards(id) ON DELETE SET NULL,
  shift_id              UUID REFERENCES shifts(id) ON DELETE SET NULL,
  incident_number       TEXT UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'other'
                        CHECK (category IN ('trespass','vandalism','theft','disturbance','medical','fire','maintenance','suspicious_activity','vehicle','cyber','transport','other')),
  severity              TEXT NOT NULL DEFAULT 'low'
                        CHECK (severity IN ('low','medium','high','critical')),
  status                TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','investigating','resolved','escalated','closed')),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo                   GEOGRAPHY(Point, 4326),
  police_called         BOOLEAN NOT NULL DEFAULT FALSE,
  police_file_number    TEXT,
  -- Structured by AI from raw narration; original is preserved.
  raw_narration         TEXT,
  ai_structured         JSONB,                  -- {who,what,when,where,how,why,actions_taken,witnesses,…}
  ai_confidence         NUMERIC(5,2),
  description_embedding VECTOR(1536),
  resolved_at           TIMESTAMPTZ,
  resolution_summary    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON incidents(org_id, status, severity);
CREATE INDEX ON incidents(site_id, occurred_at DESC);
CREATE INDEX ON incidents USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
CREATE TRIGGER incidents_set_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Evidence — chain-of-custody preserved in evidence_custody.
CREATE TABLE incident_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('photo','video','audio','document','sensor','transcript')),
  storage_url     TEXT NOT NULL,                    -- Supabase Storage signed URL
  sha256          TEXT NOT NULL,                    -- integrity check
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by     UUID REFERENCES user_profiles(id),
  geo             GEOGRAPHY(Point, 4326),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON incident_evidence(incident_id);

CREATE TABLE evidence_custody (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  evidence_id     UUID NOT NULL REFERENCES incident_evidence(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES user_profiles(id),
  action          TEXT NOT NULL CHECK (action IN ('captured','viewed','downloaded','shared','altered','destroyed','transferred')),
  reason          TEXT,
  signature_hash  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON evidence_custody(evidence_id, created_at);

-- ─── Surveillance / AI Cameras (Virtual Security Guard) ─────────────────────

CREATE TABLE cameras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  rtsp_url        TEXT,
  webrtc_endpoint TEXT,
  ai_features     TEXT[] DEFAULT '{}',     -- 'person_detection','vehicle','loitering','intrusion','ppe','fall'
  geo             GEOGRAPHY(Point, 4326),
  pan_tilt_zoom   BOOLEAN NOT NULL DEFAULT FALSE,
  online          BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER cameras_set_updated_at BEFORE UPDATE ON cameras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE camera_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  camera_id       UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  detection_type  TEXT NOT NULL,               -- model output class
  confidence      NUMERIC(5,2),
  clip_url        TEXT,
  thumbnail_url   TEXT,
  bbox            JSONB,                       -- {x,y,w,h}
  -- Operator review
  triage_status   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (triage_status IN ('pending','dismissed','escalated','resolved','false_positive')),
  triaged_by      UUID REFERENCES user_profiles(id),
  triaged_at      TIMESTAMPTZ,
  -- If escalated, links to incident.
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  ai_summary      TEXT,                        -- generated narrative for operator
  metadata        JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX ON camera_alerts(org_id, triage_status, detected_at DESC);

-- Talk-down audio events (operator → site speaker)
CREATE TABLE talkdown_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  alert_id        UUID REFERENCES camera_alerts(id) ON DELETE SET NULL,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  operator_id     UUID NOT NULL REFERENCES user_profiles(id),
  message         TEXT NOT NULL,
  delivered_via   TEXT NOT NULL CHECK (delivered_via IN ('tts','prerecorded','live')),
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Secure Transport ───────────────────────────────────────────────────────

CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  unit_number     TEXT NOT NULL,
  plate           TEXT,
  vin             TEXT,
  vehicle_type    TEXT NOT NULL CHECK (vehicle_type IN ('marked_patrol','unmarked_patrol','armoured','transport','utility')),
  capabilities    TEXT[] DEFAULT '{}',    -- 'gps','dashcam','partition','safe','satphone'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  current_geo     GEOGRAPHY(Point, 4326),
  current_geo_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE transport_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id        UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  primary_officer_id UUID REFERENCES guards(id) ON DELETE SET NULL,
  secondary_officer_id UUID REFERENCES guards(id) ON DELETE SET NULL,
  run_number        TEXT UNIQUE,
  cargo_type        TEXT,                      -- 'documents','cash','equipment','art','medical'
  cargo_value_cad   NUMERIC(14,2),
  pickup_geo        GEOGRAPHY(Point, 4326),
  dropoff_geo       GEOGRAPHY(Point, 4326),
  pickup_address    JSONB,
  dropoff_address   JSONB,
  scheduled_pickup  TIMESTAMPTZ NOT NULL,
  scheduled_dropoff TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','en_route_pickup','at_pickup','in_transit','at_dropoff','completed','cancelled','exception')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER transport_runs_set_updated_at BEFORE UPDATE ON transport_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE transport_custody_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  run_id          UUID NOT NULL REFERENCES transport_runs(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('pickup','seal','transfer','breakage','dropoff','signature')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo             GEOGRAPHY(Point, 4326),
  signed_by_name  TEXT,
  signature_url   TEXT,
  photo_urls      TEXT[],
  notes           TEXT,
  recorded_by     UUID REFERENCES user_profiles(id)
);
CREATE INDEX ON transport_custody_events(run_id, occurred_at);

-- ─── IT / Cyber MSP ─────────────────────────────────────────────────────────

CREATE TABLE it_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  hostname        TEXT NOT NULL,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('endpoint','server','network','iot','mobile','firewall','camera_nvr')),
  os              TEXT,
  os_version      TEXT,
  agent_version   TEXT,
  last_check_in   TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (status IN ('healthy','warning','critical','unknown','offline')),
  vulnerabilities JSONB DEFAULT '[]'::jsonb,
  patch_status    JSONB DEFAULT '{}'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER it_assets_set_updated_at BEFORE UPDATE ON it_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE it_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES it_assets(id) ON DELETE SET NULL,
  ticket_number   TEXT UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  assigned_to     UUID REFERENCES user_profiles(id),
  sla_due_at      TIMESTAMPTZ,
  ai_triage       JSONB,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON it_tickets(org_id, status, priority);
CREATE TRIGGER it_tickets_set_updated_at BEFORE UPDATE ON it_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PIPEDA breach register (federal Canadian privacy)
CREATE TABLE privacy_breach_register (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id          UUID REFERENCES clients(id) ON DELETE SET NULL,
  detected_at        TIMESTAMPTZ NOT NULL,
  reported_at        TIMESTAMPTZ,
  records_affected   INT,
  data_categories    TEXT[],
  description        TEXT NOT NULL,
  containment_actions TEXT,
  notification_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  opc_reported       BOOLEAN NOT NULL DEFAULT FALSE,    -- Office of the Privacy Commissioner
  opc_reported_at    TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'investigating'
                     CHECK (status IN ('investigating','contained','resolved','reported')),
  ai_risk_assessment JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER privacy_breach_set_updated_at BEFORE UPDATE ON privacy_breach_register
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Sales: Leads → Quotes → Contracts → Invoicing ──────────────────────────

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source          TEXT,                       -- 'website','referral','outbound','event'
  source_detail   TEXT,
  name            TEXT,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  city            TEXT,
  industry        TEXT,
  service_lines_interest TEXT[],
  notes           TEXT,
  ai_score        NUMERIC(5,2),               -- AI-generated 0-100
  ai_summary      TEXT,
  stage           TEXT NOT NULL DEFAULT 'new'
                  CHECK (stage IN ('new','contacted','qualified','quoted','won','lost','dormant')),
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','hot')),
  assigned_to     UUID REFERENCES user_profiles(id),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  consent         JSONB DEFAULT '{}'::jsonb,  -- PIPEDA consent capture
  utm             JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON leads(org_id, stage, priority);
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE security_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  inputs          JSONB NOT NULL,             -- full questionnaire payload
  ai_recommendation JSONB,                    -- structured services + estimate + rationale
  estimated_monthly_cad NUMERIC(12,2),
  pdf_url         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','viewed','accepted','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER security_assessments_set_updated_at BEFORE UPDATE ON security_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE,
  service_lines   TEXT[] NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  monthly_value_cad NUMERIC(12,2),
  bill_terms      TEXT,
  document_url    TEXT,
  document_embedding VECTOR(1536),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','out_for_signature','active','suspended','terminated','expired')),
  signed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
  invoice_number  TEXT UNIQUE NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  subtotal_cad    NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate        NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  gst_cad         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cad       NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','paid','overdue','void')),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  pdf_url         TEXT,
  line_items      JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── AI Sessions / Generated Insights ───────────────────────────────────────
-- Multi-modal assistant sessions are first-class objects from day one.

CREATE TABLE ai_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  surface         TEXT NOT NULL,                -- 'incident_copilot','schedule_agent','forensic_search',…
  model           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','aborted','error')),
  total_input_tokens  INT NOT NULL DEFAULT 0,
  total_output_tokens INT NOT NULL DEFAULT 0,
  cache_read_tokens   INT NOT NULL DEFAULT 0,
  cache_write_tokens  INT NOT NULL DEFAULT 0,
  cost_cad        NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER ai_sessions_set_updated_at BEFORE UPDATE ON ai_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content         JSONB NOT NULL,                -- multi-block content
  tool_name       TEXT,
  tool_use_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_messages(session_id, created_at);

CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  surface         TEXT NOT NULL,             -- 'risk','scheduling','compliance','client_health',…
  scope_type      TEXT,                      -- 'site','guard','client','contract','org'
  scope_id        UUID,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  confidence      NUMERIC(5,2) NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  recommended_action TEXT,
  citations       JSONB DEFAULT '[]'::jsonb,  -- [{table,id,note}]
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES user_profiles(id),
  dismissed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_insights(org_id, surface, created_at DESC) WHERE dismissed_at IS NULL;

-- ─── Notifications & Audit ──────────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('inapp','email','sms','push','voice')),
  topic           TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);
CREATE INDEX ON notifications(user_id, status, created_at DESC);

CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID,
  actor_user_id   UUID,
  actor_role      TEXT,
  action          TEXT NOT NULL,             -- 'INSERT','UPDATE','DELETE'
  table_name      TEXT NOT NULL,
  row_pk          TEXT,
  before_data     JSONB,
  after_data      JSONB,
  ip              INET,
  request_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_log(org_id, created_at DESC);
CREATE INDEX ON audit_log(table_name, row_pk);
