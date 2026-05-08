#!/usr/bin/env bash
# Run RLS tests. Requires DATABASE_URL pointing at a fresh Postgres with the
# auth schema (Supabase local provides this; pure Postgres needs the auth
# schema mocked — see test setup).
#
# Usage:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres ./supabase/tests/run.sh

set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "→ creating extensions"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgtap;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS test;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS auth;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS auth.users(id UUID PRIMARY KEY, email TEXT);"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS \$\$ SELECT current_setting('request.jwt.claim.sub', true)::UUID \$\$ LANGUAGE SQL STABLE;"

echo "→ applying migrations"
for f in "$ROOT"/supabase/migrations/0001_foundation.sql "$ROOT"/supabase/migrations/0002_rls.sql "$ROOT"/supabase/migrations/0003_audit.sql "$ROOT"/supabase/migrations/0025_patrol_nfc.sql "$ROOT"/supabase/migrations/0026_patrol_phase2.sql; do
  echo "  $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done

echo "→ running pgTAP tests"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/0001_rls.test.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/0002_patrol_nfc.test.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/0003_patrol_phase2.test.sql"
