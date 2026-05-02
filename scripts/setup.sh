#!/usr/bin/env bash
# One-shot setup. Brings up the local Supabase stack, applies all migrations,
# seeds dev data, and prints the connection details so the apps can boot.
#
# Idempotent: safe to re-run — `supabase db reset` truncates and re-applies.
#
# Prerequisites:
#   - npm i -g supabase            (or `brew install supabase/tap/supabase`)
#   - Docker Desktop running       (Supabase needs it for local Postgres)
#   - Node 20+

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }

step "1/6  Checking prerequisites"
command -v node >/dev/null || { echo "node not found"; exit 1; }
command -v npm >/dev/null  || { echo "npm not found"; exit 1; }
command -v supabase >/dev/null || { warn "supabase CLI not found — install: npm i -g supabase"; exit 1; }
command -v docker >/dev/null   || { warn "docker not found — Supabase local needs it"; exit 1; }
ok "all tools present"

step "2/6  Installing dependencies"
npm install --silent
ok "deps installed"

step "3/6  Booting local Supabase stack"
supabase start
ok "supabase up"

step "4/6  Applying migrations"
supabase db reset >/dev/null
ok "migrations + seed applied"

step "5/6  Writing local .env files"
ANON=$(supabase status -o json | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.ANON_KEY||j.anon_key||'')})")
URL="http://localhost:54321"
cat > .env.local <<EOF
SUPABASE_URL=$URL
SUPABASE_ANON_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.SERVICE_ROLE_KEY||j.service_role_key||'')})")
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
VITE_SUPABASE_URL=$URL
VITE_SUPABASE_ANON_KEY=$ANON
EOF
for app in console guard-mobile monitoring client-portal; do
  cp .env.local "apps/$app/.env.local"
done
ok "wrote .env.local + per-app .env.local"

step "6/6  Seeding org + admin user"
echo "Pick an admin email/password for the demo org:"
read -p "  email [admin@stigg.local]: " EMAIL
EMAIL=${EMAIL:-admin@stigg.local}
read -s -p "  password: " PASS; echo
SUPABASE_URL=$URL SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d'=' -f2-) \
  npx tsx scripts/seed-org.ts \
  --slug=stigg --name="Stigg Security" \
  --admin-email="$EMAIL" --admin-password="$PASS"

ok "Setup complete."
cat <<EOF

Next:
  npm run dev:console    →  http://localhost:5173 (sign in with $EMAIL)
  npm run dev:guard      →  http://localhost:5174
  npm run dev:monitoring →  http://localhost:5175
  npm run dev:portal     →  http://localhost:5176

To wire a real LLM (otherwise the agents use the mock):
  echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

To run all tests:
  npm test
EOF
