#!/usr/bin/env bash
# Regenerate TypeScript types from the live Supabase schema. Run after every
# migration. Output goes to packages/shared/src/db.generated.ts; the manually
# curated types in packages/shared/src/types.ts re-export the subset apps care
# about.
#
# Requires: supabase CLI (`npm i -g supabase`) and PROJECT_REF env or local stack.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
out="$ROOT/packages/shared/src/db.generated.ts"

if [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "→ generating from project $SUPABASE_PROJECT_REF"
  supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > "$out"
else
  echo "→ generating from local stack"
  supabase gen types typescript --local > "$out"
fi
echo "✓ wrote $out"
