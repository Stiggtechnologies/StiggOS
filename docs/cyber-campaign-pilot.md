# Stigg Cyber campaign pilot

The first slice is a development-only sandbox on the existing Sales Pipeline route. It validates a synthetic CSV, separates customers and leads, previews eligibility and cadence, requires a human to approve each simulated run, prevents duplicate enrollments, and reconciles stops. Nothing persists across sessions; there is no provider, database write, or customer-data path.

- Run the app in development, sign in to the existing sample workspace and open Sales Pipeline. Use synthetic records only.
- Use the example CSV and choose a start date before its sample expiry. Check import, reimport, approve email, reapprove and reconcile an opt-out. Reset to simulate SMS separately.
- Run `node --test tests/campaign-pilot.test.mjs` using Node 24 and `npm run build`. The production bundle must not contain the sandbox UI.

## Staging and production gates

Keep the existing CRM as the source of truth. Private staging must have verified organization-bound roles, server-side RLS tests, auditable approval and suppression state, a controlled import with row counts and mapping overrides, and reconciliation before real records are loaded. Development-only date arithmetic skips weekends but not statutory holidays; replace it with the agreed business calendar before scheduling. An approval is not a delivery: future outbound requires a verified provider, permission evidence, per-touch eligibility checks, idempotency persisted server-side, and tested stop and opt-out handling. Legal entities and channel permissions remain separate.

## Company isolation preflight

`supabase/staging/campaign_isolation_preflight.sql` is a separate, not-deployed, synthetic-only PostgreSQL preflight. It uses operator-provisioned membership, rejects real email addresses, and gives authenticated users tenant-isolated reads only. It is not wired to the app, never changes existing tables, does not prove the deployed database is isolated, and must not be run against production. Run `tests/campaign-isolation.test.mjs` with Node 24 and the PGlite test dependency from a disposable tool directory. The test compares two companies and verifies outsider, anonymous and write denials.
