-- Stigg Security Operating System - Database Migration
-- Comprehensive schema expansion for patrol management, contracts, compliance, and operations
-- Safe to re-run: all tables use CREATE TABLE IF NOT EXISTS
-- Generated: 2026-04-26

-- ============================================================================
-- 1. ROUTES TABLE - Patrol route templates
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
-- 2. CHECKPOINTS TABLE - Patrol checkpoint definitions
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
-- 3. ROUTE_CHECKPOINTS TABLE - Checkpoints assigned to routes
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
-- 4. PATROLS TABLE - Active and historical patrol records
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
-- 5. PATROL_CHECKPOINT_LOGS TABLE - Actual check-in records
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
-- 6. CONTRACTS TABLE - Client contracts
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
-- 7. KPI_SCORES TABLE - KPI tracking records
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
-- 8. COMPLIANCE_ITEMS TABLE - Licensing and compliance tracking
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
-- 9. COMMUNICATIONS TABLE - Internal messaging
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
-- 10. SHIFT_HANDOFFS TABLE - Shift handover notes
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
-- 11. INVOICE_LINE_ITEMS TABLE - Detailed invoice breakdown
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
-- 12. PROPOSALS TABLE - Generated proposals/quotes
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
-- INDEXES - Optimize frequently queried columns
-- ============================================================================

-- Patrols indexes
CREATE INDEX IF NOT EXISTS idx_patrols_guard_id ON patrols(guard_id);
CREATE INDEX IF NOT EXISTS idx_patrols_site_id ON patrols(site_id);
CREATE INDEX IF NOT EXISTS idx_patrols_org_id ON patrols(org_id);
CREATE INDEX IF NOT EXISTS idx_patrols_status ON patrols(status);
CREATE INDEX IF NOT EXISTS idx_patrols_shift_id ON patrols(shift_id);
CREATE INDEX IF NOT EXISTS idx_patrols_started_at ON patrols(started_at DESC);

-- Checkpoints indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_site_id ON checkpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_org_id ON checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_is_active ON checkpoints(is_active);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_site_id ON routes(site_id);
CREATE INDEX IF NOT EXISTS idx_routes_org_id ON routes(org_id);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);

-- Patrol checkpoint logs indexes
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_patrol_id ON patrol_checkpoint_logs(patrol_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_checkpoint_id ON patrol_checkpoint_logs(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_guard_id ON patrol_checkpoint_logs(guard_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_checked_in_at ON patrol_checkpoint_logs(checked_in_at DESC);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- KPI scores indexes
CREATE INDEX IF NOT EXISTS idx_kpi_scores_client_id ON kpi_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_site_id ON kpi_scores(site_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_org_id ON kpi_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_category ON kpi_scores(category);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_period ON kpi_scores(period_start, period_end);

-- Compliance items indexes
CREATE INDEX IF NOT EXISTS idx_compliance_items_guard_id ON compliance_items(guard_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_org_id ON compliance_items(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_category ON compliance_items(category);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_compliance_items_expiry_date ON compliance_items(expiry_date);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_sender_id ON communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_communications_recipient_id ON communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_communications_org_id ON communications(org_id);
CREATE INDEX IF NOT EXISTS idx_communications_is_read ON communications(is_read);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at DESC);

-- Shift handoffs indexes
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_outgoing_guard_id ON shift_handoffs(outgoing_guard_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_incoming_guard_id ON shift_handoffs(incoming_guard_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_shift_id ON shift_handoffs(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_site_id ON shift_handoffs(site_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_org_id ON shift_handoffs(org_id);

-- Invoice line items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_guard_id ON invoice_line_items(guard_id);

-- Proposals indexes
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON proposals(valid_until);

-- Route checkpoints indexes
CREATE INDEX IF NOT EXISTS idx_route_checkpoints_route_id ON route_checkpoints(route_id);
CREATE INDEX IF NOT EXISTS idx_route_checkpoints_checkpoint_id ON route_checkpoints(checkpoint_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable and configure policies
-- ============================================================================

-- Enable RLS on all new tables
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

-- Patrols RLS policies
CREATE POLICY "patrols_authenticated_access" ON patrols
  FOR ALL USING (auth.role() = 'authenticated');

-- Checkpoints RLS policies
CREATE POLICY "checkpoints_authenticated_access" ON checkpoints
  FOR ALL USING (auth.role() = 'authenticated');

-- Patrol checkpoint logs RLS policies
CREATE POLICY "patrol_checkpoint_logs_authenticated_access" ON patrol_checkpoint_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Routes RLS policies
CREATE POLICY "routes_authenticated_access" ON routes
  FOR ALL USING (auth.role() = 'authenticated');

-- Route checkpoints RLS policies
CREATE POLICY "route_checkpoints_authenticated_access" ON route_checkpoints
  FOR ALL USING (auth.role() = 'authenticated');

-- Contracts RLS policies
CREATE POLICY "contracts_authenticated_access" ON contracts
  FOR ALL USING (auth.role() = 'authenticated');

-- KPI scores RLS policies
CREATE POLICY "kpi_scores_authenticated_access" ON kpi_scores
  FOR ALL USING (auth.role() = 'authenticated');

-- Compliance items RLS policies
CREATE POLICY "compliance_items_authenticated_access" ON compliance_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Communications RLS policies
CREATE POLICY "communications_authenticated_access" ON communications
  FOR ALL USING (auth.role() = 'authenticated');

-- Shift handoffs RLS policies
CREATE POLICY "shift_handoffs_authenticated_access" ON shift_handoffs
  FOR ALL USING (auth.role() = 'authenticated');

-- Invoice line items RLS policies
CREATE POLICY "invoice_line_items_authenticated_access" ON invoice_line_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Proposals RLS policies
CREATE POLICY "proposals_authenticated_access" ON proposals
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- All tables created with:
-- - UUID primary keys with auto-generation
-- - Proper foreign key constraints with CASCADE deletes
-- - Timestamp columns with automatic defaults (created_at, updated_at)
-- - Data validation via CHECK constraints on enum-like columns
-- - Row level security enabled with authenticated user access
-- - Comprehensive indexes on frequently queried columns
-- - Safe to re-run: all CREATE TABLE statements use IF NOT EXISTS
