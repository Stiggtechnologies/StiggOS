-- ============================================================================
-- Row-Level Security policies.
--
-- Tenant isolation is enforced at the database level. Every tenant table
-- requires that the caller's user_profile.org_id matches the row's org_id.
-- Clients (role='client') are further scoped to rows they own.
-- ============================================================================

-- Helper: standard tenant policy. Reads & writes require org match.
CREATE OR REPLACE FUNCTION install_tenant_rls(target_table TEXT)
RETURNS VOID AS $$
DECLARE
  policy_name TEXT;
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target_table);

  policy_name := target_table || '_tenant_select';
  EXECUTE format($f$
    DROP POLICY IF EXISTS %I ON %I;
    CREATE POLICY %I ON %I FOR SELECT
      USING (org_id = current_user_org_id());
  $f$, policy_name, target_table, policy_name, target_table);

  policy_name := target_table || '_tenant_insert';
  EXECUTE format($f$
    DROP POLICY IF EXISTS %I ON %I;
    CREATE POLICY %I ON %I FOR INSERT
      WITH CHECK (org_id = current_user_org_id());
  $f$, policy_name, target_table, policy_name, target_table);

  policy_name := target_table || '_tenant_update';
  EXECUTE format($f$
    DROP POLICY IF EXISTS %I ON %I;
    CREATE POLICY %I ON %I FOR UPDATE
      USING (org_id = current_user_org_id())
      WITH CHECK (org_id = current_user_org_id());
  $f$, policy_name, target_table, policy_name, target_table);

  policy_name := target_table || '_tenant_delete';
  EXECUTE format($f$
    DROP POLICY IF EXISTS %I ON %I;
    CREATE POLICY %I ON %I FOR DELETE
      USING (org_id = current_user_org_id()
        AND current_user_role() IN ('owner','admin'));
  $f$, policy_name, target_table, policy_name, target_table);
END;
$$ LANGUAGE plpgsql;

-- Apply to every tenant-scoped table.
SELECT install_tenant_rls(t) FROM unnest(ARRAY[
  'clients','partners','sites','post_orders','guards','shifts',
  'lone_worker_checkins','tour_routes','tour_checkpoints','tour_runs','tour_scans',
  'incidents','incident_evidence','evidence_custody',
  'cameras','camera_alerts','talkdown_events',
  'vehicles','transport_runs','transport_custody_events',
  'it_assets','it_tickets','privacy_breach_register',
  'leads','security_assessments','contracts','invoices',
  'ai_sessions','ai_messages','ai_insights',
  'notifications'
]) AS t;

-- orgs and user_profiles need bespoke policies.
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orgs_self_select ON orgs;
CREATE POLICY orgs_self_select ON orgs FOR SELECT
  USING (id = current_user_org_id());
DROP POLICY IF EXISTS orgs_owner_update ON orgs;
CREATE POLICY orgs_owner_update ON orgs FOR UPDATE
  USING (id = current_user_org_id() AND current_user_role() IN ('owner','admin'));

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_org_select ON user_profiles;
CREATE POLICY user_profiles_org_select ON user_profiles FOR SELECT
  USING (org_id = current_user_org_id());
DROP POLICY IF EXISTS user_profiles_self_update ON user_profiles;
CREATE POLICY user_profiles_self_update ON user_profiles FOR UPDATE
  USING (auth_user_id = auth.uid());
DROP POLICY IF EXISTS user_profiles_admin_manage ON user_profiles;
CREATE POLICY user_profiles_admin_manage ON user_profiles FOR ALL
  USING (org_id = current_user_org_id() AND current_user_role() IN ('owner','admin'))
  WITH CHECK (org_id = current_user_org_id() AND current_user_role() IN ('owner','admin'));

-- Client portal narrowing — clients only see their own rows.
DROP POLICY IF EXISTS clients_self_select ON clients;
CREATE POLICY clients_self_select ON clients FOR SELECT
  USING (
    org_id = current_user_org_id()
    AND (current_user_role() <> 'client' OR id = current_user_client_id())
  );

DROP POLICY IF EXISTS sites_client_select ON sites;
CREATE POLICY sites_client_select ON sites FOR SELECT
  USING (
    org_id = current_user_org_id()
    AND (current_user_role() <> 'client' OR client_id = current_user_client_id())
  );

DROP POLICY IF EXISTS incidents_client_select ON incidents;
CREATE POLICY incidents_client_select ON incidents FOR SELECT
  USING (
    org_id = current_user_org_id()
    AND (
      current_user_role() <> 'client'
      OR site_id IN (SELECT id FROM sites WHERE client_id = current_user_client_id())
    )
  );

-- audit_log: append-only, readable by admins of the org only.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_admin_select ON audit_log;
CREATE POLICY audit_log_admin_select ON audit_log FOR SELECT
  USING (org_id = current_user_org_id() AND current_user_role() IN ('owner','admin'));
-- No direct INSERT/UPDATE/DELETE policies — only the audit trigger writes.
