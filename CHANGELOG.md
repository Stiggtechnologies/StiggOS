# Changelog

All notable changes to StiggOS. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is calendar-based until 1.0.

## [Unreleased]

### Added — `os-v2-rebuild`

- **Multi-provider LLM** — Claude, GPT, Gemini, OpenAI-compatible (Ollama/vLLM/Groq/Together/Fireworks/OpenRouter), and a deterministic mock. Provider chosen by env var; one normalized message shape across providers; no SDK dependencies. See `docs/LLM-PROVIDERS.md`.
- **Postgres schema, v1** — orgs, RBAC, sites, guards, shifts, tour routes/runs/scans, lone-worker check-ins, incidents (with PostGIS + pgvector), incident evidence + custody, cameras + alerts + talk-down, vehicles + transport runs + custody events, IT assets + tickets, PIPEDA breach register, leads + security assessments + contracts + invoices, AI sessions/messages/insights, notifications, audit log.
- **RLS on every tenant table** with role-based scoping — `client` users restricted to their bound `client_id`. pgTAP test suite verifies cross-org reads/writes are blocked.
- **Audit trigger** — every mutation captures actor, role, IP, request id, before/after JSON to an append-only audit_log.
- **Plug-in compliance engine** — Alberta SSIA license expiry, OHS first-aid + Working Alone, federal PIPEDA breach notification + drill cadence. Vitest unit tests cover all rules.
- **Five AI agent surfaces** — Incident Copilot, Schedule Agent, Compliance Co-pilot, Forensic Search, Sales Assessment. Each is a Supabase Edge Function with prompt caching, tool calling, and per-call cost telemetry.
- **Three Stripe-aware billing functions** — `billing-run` (computes monthly invoices from contracts × completed shifts × bill_rate, GST 5%), `stripe-webhook` (signature-verified, reflects paid/failed/finalized), `invoice-pdf` (renders a clean GST-compliant invoice HTML to Storage).
- **Console app** — 13 working pages: Command Center (realtime), Incidents, Incident Copilot, AI Intelligence, Scheduling, Compliance, Forensic Search, Guards, Sites, Patrols, Equipment/Vehicles, IT/Cyber, Secure Transport, Clients, Sales Pipeline, Contracts, Invoices, Audit Log, Settings, Messages.
- **Client Portal app** — auth, dashboard, my sites, incidents, invoices, plain-English Q&A. RLS-scoped, customer-facing.
- **Guard mobile PWA** — geofenced clock-in, tour scan, voice-to-incident dictation, hold-to-trigger panic, **offline queue with service-worker-coordinated replay**.
- **Monitoring app** — Virtual Security Guard ops console: camera grid, live alert stream (Supabase Realtime), triage drawer with escalate-to-incident and talk-down composer.
- **Operations scripts** — `setup.sh` (one-shot dev bootstrap), `seed-org.ts` (org + admin user), `import-csv.ts` (Trackforce/Silvertrac/TrackTik header-aliased import for guards/sites/clients/incidents), `gen-types.sh` (regenerate types from Supabase).
- **Deployment** — `vercel.json` per app with security headers, `Dockerfile` per app, `docker-compose.yml`, `fly.toml` example. SPA fallback + cache-busting headers in nginx.
- **CI** — typecheck / unit / Playwright e2e / Deno edge-function tests / Postgres+PostGIS+pgTAP migration validation.
- **Daily compliance scan** via `pg_cron` + `pg_net` calling the `compliance-watcher` edge function.
- **Storage buckets** — `evidence` (private, signed URLs) and `invoices` (public-read for portal).
- **Runbooks + playbooks** — deployment, incident response, SSIA license expiry, PIPEDA breach, load shedding, operator daily/weekly cadence, 12-minute demo script.

### Changed
- Repo went from a single Vite SPA to a four-app monorepo with shared packages.
- LLM access now uses raw `fetch` everywhere — `@anthropic-ai/sdk` removed.

### Removed
- Hardcoded `DEMO_DATA` arrays from every page. Errors surface instead of silent fallback.
- The fake "AI Intelligence" string array. Replaced with real `ai_insights` queries with row-level citations.
- The `psisa_license` Ontario field — Alberta uses **SSIA** (`ssia_license_number`).

## [0.1.0] — pre-rebuild

Single-app React 19 + Vite + Supabase prototype with 25 routed pages, role-based access, and a static AI Intelligence mockup.
