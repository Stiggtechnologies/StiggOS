-- pgTAP tests for tenant isolation. Run via:
--   psql $DATABASE_URL -f supabase/migrations/0001_foundation.sql
--   psql $DATABASE_URL -f supabase/migrations/0002_rls.sql
--   psql $DATABASE_URL -f supabase/migrations/0003_audit.sql
--   psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgtap;"
--   psql $DATABASE_URL -f supabase/tests/0001_rls.test.sql
--
-- Two orgs, two users, two clients. Asserts:
--   1. Each user only sees their org's rows.
--   2. role='client' is further scoped to their own client_id.
--   3. audit_log is admin-only.

BEGIN;
SELECT plan(11);

-- Test fixtures.
DO $$
DECLARE
  org_a UUID; org_b UUID;
  user_a UUID; user_b UUID; client_user_a UUID;
  client_a1 UUID; client_a2 UUID; client_b UUID;
BEGIN
  INSERT INTO orgs(name, slug, region) VALUES ('Org A','org-a','AB') RETURNING id INTO org_a;
  INSERT INTO orgs(name, slug, region) VALUES ('Org B','org-b','AB') RETURNING id INTO org_b;

  -- Mock auth.users entries.
  INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'admin-a@x.test') RETURNING id INTO user_a;
  INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'admin-b@x.test') RETURNING id INTO user_b;
  INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'client-a@x.test') RETURNING id INTO client_user_a;

  INSERT INTO user_profiles(auth_user_id, org_id, email, role)
    VALUES (user_a, org_a, 'admin-a@x.test', 'admin');
  INSERT INTO user_profiles(auth_user_id, org_id, email, role)
    VALUES (user_b, org_b, 'admin-b@x.test', 'admin');

  INSERT INTO clients(org_id, name) VALUES (org_a, 'Client A1') RETURNING id INTO client_a1;
  INSERT INTO clients(org_id, name) VALUES (org_a, 'Client A2') RETURNING id INTO client_a2;
  INSERT INTO clients(org_id, name) VALUES (org_b, 'Client B') RETURNING id INTO client_b;

  -- Bind client user to client_a1 only.
  INSERT INTO user_profiles(auth_user_id, org_id, email, role, client_id)
    VALUES (client_user_a, org_a, 'client-a@x.test', 'client', client_a1);

  PERFORM set_config('test.org_a', org_a::text, false);
  PERFORM set_config('test.org_b', org_b::text, false);
  PERFORM set_config('test.user_a', user_a::text, false);
  PERFORM set_config('test.user_b', user_b::text, false);
  PERFORM set_config('test.client_user_a', client_user_a::text, false);
  PERFORM set_config('test.client_a1', client_a1::text, false);
  PERFORM set_config('test.client_a2', client_a2::text, false);
  PERFORM set_config('test.client_b', client_b::text, false);
END $$;

-- Helper: become a user by setting auth.uid() via local config.
CREATE OR REPLACE FUNCTION test.become(uid UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
END $$;

-- Test 1: admin-A sees only Org A clients.
SELECT test.become(current_setting('test.user_a')::UUID);
SELECT bag_eq(
  $$ SELECT name FROM clients ORDER BY name $$,
  $$ VALUES ('Client A1'), ('Client A2') $$,
  'Org A admin sees both Org A clients'
);

-- Test 2: admin-A does NOT see Org B clients.
SELECT is_empty(
  $$ SELECT 1 FROM clients WHERE name = 'Client B' $$,
  'Org A admin cannot see Org B clients'
);

-- Test 3: admin-B sees only Org B clients.
SELECT test.become(current_setting('test.user_b')::UUID);
SELECT bag_eq(
  $$ SELECT name FROM clients $$,
  $$ VALUES ('Client B') $$,
  'Org B admin sees only Org B clients'
);

-- Test 4: client user sees only their bound client.
SELECT test.become(current_setting('test.client_user_a')::UUID);
SELECT bag_eq(
  $$ SELECT name FROM clients $$,
  $$ VALUES ('Client A1') $$,
  'Client user sees only their bound client row'
);

-- Test 5: client user does NOT see Client A2 (same org).
SELECT is_empty(
  $$ SELECT 1 FROM clients WHERE name = 'Client A2' $$,
  'Client user is scoped within the org to their own client_id'
);

-- Test 6: cross-org INSERT is blocked.
SELECT test.become(current_setting('test.user_a')::UUID);
PREPARE wrong_org_insert AS
  INSERT INTO clients(org_id, name) VALUES (current_setting('test.org_b')::UUID, 'Sneaky');
SELECT throws_ok(
  'EXECUTE wrong_org_insert',
  NULL,
  'INSERT into a different org_id is rejected by RLS'
);

-- Test 7: incidents are tenant-scoped.
SELECT test.become(current_setting('test.user_a')::UUID);
INSERT INTO sites(org_id, client_id, name)
  VALUES (current_setting('test.org_a')::UUID, current_setting('test.client_a1')::UUID, 'Site A');
INSERT INTO incidents(org_id, site_id, title, category, severity, status)
  SELECT current_setting('test.org_a')::UUID, id, 'Test', 'other', 'low', 'open' FROM sites WHERE name='Site A';
SELECT is(
  (SELECT count(*)::int FROM incidents),
  1,
  'Org A admin sees one incident in their org'
);
SELECT test.become(current_setting('test.user_b')::UUID);
SELECT is(
  (SELECT count(*)::int FROM incidents),
  0,
  'Org B admin sees zero incidents from Org A'
);

-- Test 8: audit_log is admin-only.
SELECT test.become(current_setting('test.user_a')::UUID);
SELECT isnt_empty(
  $$ SELECT 1 FROM audit_log $$,
  'Admin can read the audit log of their org'
);
SELECT test.become(current_setting('test.client_user_a')::UUID);
SELECT is_empty(
  $$ SELECT 1 FROM audit_log $$,
  'Client role cannot read audit log'
);

-- Test 9: audit trigger captured the insert.
SELECT test.become(current_setting('test.user_a')::UUID);
SELECT isnt_empty(
  $$ SELECT 1 FROM audit_log WHERE table_name='incidents' AND action='INSERT' $$,
  'Audit log captured the incident INSERT'
);

SELECT * FROM finish();
ROLLBACK;
