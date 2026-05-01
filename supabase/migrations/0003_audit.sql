-- ============================================================================
-- Universal audit trigger. Every mutation on a tenant table appends a row
-- to audit_log with before/after state, actor, role, IP, and request ID.
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_role  TEXT;
  v_org   UUID;
  v_ip    INET;
  v_req   TEXT;
  v_pk    TEXT;
BEGIN
  v_actor := auth.uid();
  v_role  := current_user_role();
  v_ip    := NULLIF(current_setting('request.headers', true)::jsonb->>'x-forwarded-for','')::INET;
  v_req   := current_setting('request.id', true);

  IF TG_OP = 'DELETE' THEN
    v_pk  := OLD.id::TEXT;
    v_org := OLD.org_id;
    INSERT INTO audit_log(org_id, actor_user_id, actor_role, action, table_name, row_pk, before_data, ip, request_id)
    VALUES (v_org, v_actor, v_role, TG_OP, TG_TABLE_NAME, v_pk, to_jsonb(OLD), v_ip, v_req);
    RETURN OLD;
  ELSE
    v_pk  := NEW.id::TEXT;
    v_org := NEW.org_id;
    INSERT INTO audit_log(org_id, actor_user_id, actor_role, action, table_name, row_pk, before_data, after_data, ip, request_id)
    VALUES (
      v_org, v_actor, v_role, TG_OP, TG_TABLE_NAME, v_pk,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      v_ip, v_req
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION install_audit_trigger(target_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format($f$
    DROP TRIGGER IF EXISTS %I ON %I;
    CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION audit_row_change();
  $f$, target_table || '_audit', target_table, target_table || '_audit', target_table);
END;
$$ LANGUAGE plpgsql;

SELECT install_audit_trigger(t) FROM unnest(ARRAY[
  'orgs','user_profiles','clients','partners','sites','post_orders','guards','shifts',
  'incidents','incident_evidence','evidence_custody',
  'cameras','camera_alerts',
  'vehicles','transport_runs','transport_custody_events',
  'it_assets','it_tickets','privacy_breach_register',
  'leads','security_assessments','contracts','invoices'
]) AS t;
