-- Stigg Security Operating System - COMPLETE Database Migration
-- Includes foundation tables + expansion tables
-- Safe to re-run: all tables use CREATE TABLE IF NOT EXISTS
-- Generated: 2026-04-26

-- ============================================================================
-- FOUNDATION TABLE 1: ORGS - Organization/tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT,
  city TEXT DEFAULT 'Calgary',
  province TEXT DEFAULT 'AB',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  gst_number TEXT,
  wcb_number TEXT,
  psisa_license TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 2: USER_PROFILES - Auth-linked user profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'dispatcher', 'guard', 'viewer', 'client')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 3: CLIENTS - Client organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'AB',
  postal_code TEXT,
  industry TEXT,
  tier TEXT CHECK (tier IN ('Essential', 'Enhanced', 'Premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes TEXT,
  portal_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 4: SITES - Physical locations/properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Calgary',
  province TEXT DEFAULT 'AB',
  postal_code TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  geofence_radius_meters INT DEFAULT 100,
  suites_count INT DEFAULT 0,
  site_type TEXT DEFAULT 'residential' CHECK (site_type IN ('residential', 'commercial', 'industrial', 'mixed', 'institutional')),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 5: GUARDS - Security guard personnel
-- ============================================================================
CREATE TABLE IF NOT EXISTS guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hourly_rate NUMERIC(10, 2),
  annual_salary NUMERIC(12, 2),
  employment_type TEXT DEFAULT 'hourly' CHECK (employment_type IN ('hourly', 'salary', 'contractor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  hire_date DATE,
  security_license_number TEXT,
  security_license_expiry DATE,
  first_aid_expiry DATE,
  certifications JSONB DEFAULT '[]',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 6: SHIFTS - Guard shift assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT DEFAULT 'night' CHECK (shift_type IN ('day', 'night', 'overnight', 'split')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  hours_worked NUMERIC(8, 2),
  overtime_hours NUMERIC(8, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 7: INCIDENTS - Security incident reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  guard_id UUID REFERENCES guards(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  incident_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('trespass', 'vandalism', 'theft', 'disturbance', 'medical', 'fire', 'maintenance', 'suspicious_activity', 'vehicle', 'other')),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'escalated', 'closed')),
  location_detail TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  police_called BOOLEAN DEFAULT FALSE,
  police_file_number TEXT,
  photos JSONB DEFAULT '[]',
  reported_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 8: INVOICES - Client invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  gst_rate NUMERIC(5, 4) DEFAULT 0.05,
  gst_amount NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FOUNDATION TABLE 9: PAYROLL_LIABILITIES - Payroll tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  regular_hours NUMERIC(8, 2) DEFAULT 0,
  overtime_hours NUMERIC(8, 2) DEFAULT 0,
  hourly_rate NUMERIC(10, 2),
  gross_pay NUMERIC(12, 2),
  cpp_deduction NUMERIC(10, 2) DEFAULT 0,
  ei_deduction NUMERIC(10, 2) DEFAULT 0,
  tax_deduction NUMERIC(10, 2) DEFAULT 0,
  net_pay NUMERIC(12, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 1: ROUTES - Patrol route templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  cluster TEXT CHECK (cluster IN ('A', 'B')),
  estimated_duration_minutes INT,
  is_randomized BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 2: CHECKPOINTS - Patrol checkpoint definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  expected_duration_minutes INT,
  sequence_order INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 3: ROUTE_CHECKPOINTS - Checkpoints assigned to routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS route_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(route_id, checkpoint_id)
);

-- ============================================================================
-- EXPANSION TABLE 4: PATROLS - Active and historical patrol records
-- ============================================================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  checkpoints_completed INT DEFAULT 0,
  total_checkpoints INT,
  compliance_score NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 5: PATROL_CHECKPOINT_LOGS - Actual check-in records
-- ============================================================================
CREATE TABLE IF NOT EXISTS patrol_checkpoint_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_within_geofence BOOLEAN,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 6: CONTRACTS - Client contracts
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('Essential', 'Enhanced', 'Premium')),
  season TEXT CHECK (season IN ('Summer', 'Winter', 'Year-Round')),
  monthly_value NUMERIC(12, 2),
  start_date DATE,
  end_date DATE,
  auto_renewal BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Active', 'Renewal', 'Expired')),
  properties_count INT,
  suites_count INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 7: KPI_SCORES - KPI tracking records
-- ============================================================================
CREATE TABLE IF NOT EXISTS kpi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('asset_protection', 'patrol_compliance', 'incident_response', 'risk_trends', 'maintenance_impact')),
  score NUMERIC(5, 2),
  target NUMERIC(5, 2),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 8: COMPLIANCE_ITEMS - Licensing and compliance tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('licensing', 'training', 'insurance', 'documentation', 'health_safety')),
  name TEXT NOT NULL,
  description TEXT,
  guard_id UUID REFERENCES guards(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('current', 'expiring_soon', 'expired', 'missing', 'in_progress')),
  expiry_date DATE,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 9: COMMUNICATIONS - Internal messaging
-- ============================================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'channel', 'broadcast')),
  recipient_id UUID,
  channel TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 10: SHIFT_HANDOFFS - Shift handover notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  outgoing_guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  incoming_guard_id UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  notes TEXT,
  incidents_reported INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 11: INVOICE_LINE_ITEMS - Detailed invoice breakdown
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  guard_id UUID REFERENCES guards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  hours_worked NUMERIC(8, 2),
  hourly_rate NUMERIC(10, 2),
  subtotal NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPANSION TABLE 12: PROPOSALS - Generated proposals/quotes
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  prospect_name TEXT,
  prospect_email TEXT,
  tier TEXT CHECK (tier IN ('Essential', 'Enhanced', 'Premium')),
  season TEXT CHECK (season IN ('Summer', 'Winter', 'Year-Round')),
  properties_count INT,
  suites_count INT,
  monthly_value NUMERIC(12, 2),
  annual_value NUMERIC(12, 2),
  add_ons JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined')),
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Foundation table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_sites_org_id ON sites(org_id);
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);
CREATE INDEX IF NOT EXISTS idx_guards_org_id ON guards(org_id);
CREATE INDEX IF NOT EXISTS idx_guards_status ON guards(status);
CREATE INDEX IF NOT EXISTS idx_shifts_org_id ON shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_shifts_guard_id ON shifts(guard_id);
CREATE INDEX IF NOT EXISTS idx_shifts_site_id ON shifts(site_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_id ON incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_site_id ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_guard_id ON incidents(guard_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payroll_org_id ON payroll_liabilities(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_guard_id ON payroll_liabilities(guard_id);

-- Expansion table indexes
CREATE INDEX IF NOT EXISTS idx_patrols_guard_id ON patrols(guard_id);
CREATE INDEX IF NOT EXISTS idx_patrols_site_id ON patrols(site_id);
CREATE INDEX IF NOT EXISTS idx_patrols_org_id ON patrols(org_id);
CREATE INDEX IF NOT EXISTS idx_patrols_status ON patrols(status);
CREATE INDEX IF NOT EXISTS idx_patrols_shift_id ON patrols(shift_id);
CREATE INDEX IF NOT EXISTS idx_patrols_started_at ON patrols(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_site_id ON checkpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_org_id ON checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_routes_site_id ON routes(site_id);
CREATE INDEX IF NOT EXISTS idx_routes_org_id ON routes(org_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_patrol_id ON patrol_checkpoint_logs(patrol_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_checkpoint_id ON patrol_checkpoint_logs(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_guard_id ON patrol_checkpoint_logs(guard_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_client_id ON kpi_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_org_id ON kpi_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_category ON kpi_scores(category);
CREATE INDEX IF NOT EXISTS idx_compliance_items_org_id ON compliance_items(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_guard_id ON compliance_items(guard_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_communications_org_id ON communications(org_id);
CREATE INDEX IF NOT EXISTS idx_communications_sender_id ON communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_org_id ON shift_handoffs(org_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_shift_id ON shift_handoffs(shift_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_route_checkpoints_route_id ON route_checkpoints(route_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_checkpoint_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow authenticated access to all Stigg OS tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'orgs','user_profiles','clients','sites','guards','shifts','incidents',
    'invoices','payroll_liabilities','patrols','checkpoints','patrol_checkpoint_logs',
    'routes','route_checkpoints','contracts','kpi_scores','compliance_items',
    'communications','shift_handoffs','invoice_line_items','proposals'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated_access" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s_authenticated_access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- SEED DATA - Insert Stigg Security org
-- ============================================================================
INSERT INTO orgs (name, slug, city, province, phone, email, website, gst_number, psisa_license)
SELECT 'Stigg Security Inc.', 'stigg-security', 'Calgary', 'AB', '+1-403-555-0100', 'info@stiggsecurity.com', 'https://stiggsecurity.com', 'GST-123456789', 'PSISA-2024-001'
WHERE NOT EXISTS (SELECT 1 FROM orgs WHERE slug = 'stigg-security');

-- ============================================================================
-- END OF COMPLETE MIGRATION
-- ============================================================================
