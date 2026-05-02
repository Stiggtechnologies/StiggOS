# Changelog

All notable changes to StiggOS. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is calendar-based until 1.0.

## [Unreleased]

### Added — `os-v2-rebuild` (cont'd, Northview go-live pass)

- **First live customer contract: Northview Residential REIT (NV-2026-0001).** Month-to-month MSA with seasonal pricing (May–Oct $9,900 / Nov–Apr $14,150 + GST), seven Fort McMurray sites (Parkview I/II, 6/4 Nixon, 16/15 Saunderson + MacDonald optional add-on), six checkpoints per site, two route flows (A/B) alternating weekly, KPI framework wired.
- **Schema 0007** — `contracts.pricing_schedule` (seasonal slots with components), `contracts.kpi_targets`, `contract_sites` (junction with `is_optional`), `contract_kpi_snapshots` (monthly rollups, idempotent), `sites.post_order_template`, `shifts.guard_id` made nullable so demand rows can be seeded before Schedule Agent assigns. View `v_contract_patrol_delivery` for completion % per contract per month.
- **`@stigg/scheduling`** (new package, 12 tests) — deterministic seasonal patrol generator. Same seed → same schedule. Honours: 1 visit summer / 2 visits winter, ±15 min flex, Wave 1 + Wave 2 windows in the contract's local timezone with DST handling, ISO-week alternation between Flow A and Flow B, `every_other_day` pattern for optional sites in summer, override of visits-per-night per site. Plus `pickSeasonalRate()` for billing slot resolution.
- **`scripts/seed-northview.ts`** — single idempotent script that loads the entire signed MSA into a live database: client, 7 sites with geofences + post-order markdown, contract with seasonal pricing + KPI targets, contract↔site links, 2 tour routes per site with 6 checkpoints each, "Northview after-hours patrol" arming schedule, org-scoped linkage rule for tour-miss → Dawn email, Dawn Collier portal user, 60 days of pre-generated shift demand. Re-running is safe.
- **`billing-run` honors `pricing_schedule`.** Picks the seasonal slot for the invoice month, emits one invoice line item per pricing component (Core / MacDonald), still adds Alberta GST 5%.
- **`contract-kpi-snapshot` edge function** — computes the five KPI buckets (Patrol Delivery, Asset Protection, Incident Response, Hotspot Trends, Maintenance Impact) for a contract×month, writes/upserts a `contract_kpi_snapshots` row with an AI-narrated `summary_md` for the management review.
- **Console — Contract Dashboard** at `/contracts/:id`. Per-month KPI buckets, seasonal pricing card showing the current slot + component breakdown, sites under contract, snapshot history with completion-% + incident counts, "Refresh KPI snapshot" calls the edge function. Row click on `/contracts` drills in.
- **Operating runbook** `docs/CONTRACTS-NORTHVIEW.md` — daily / weekly / monthly cadence, escalation paths, common scenarios (sick guard, hotspot request, mid-contract add, damage claim, termination).
- **Root scripts** — `npm run seed:northview`.

### Added — `os-v2-rebuild` (cont'd, automation pass)

- **Camera-event automation that the standalone NVR can't do.** `arming_schedules` (when), `linkage_rules` (event × severity → action set), `dispatch_routes` (rotating pool of human/automated/police targets with cooldowns + escalation chains), `dispatch_events` (audit log of every fan-out). Replaces what HikCentral Professional does — vendor-agnostic.
- **`@stigg/dispatch` package** — pure deterministic evaluator. Picks the most-specific rule, gates on the arming schedule, fans out actions, advances rotation state. Handles `round_robin`, `escalation`, `severity_escalation`, `broadcast`. 25 unit tests covering every branch.
- **`@stigg/integrations`** — vendor adapters with no SDK deps:
  - `hikvision/` — ISAPI event parser, HMAC-SHA256 webhook verifier, relay/PTZ/overlay client.
  - `traccar/` — OsmAnd query + Traccar JSON forwarder parsing; speeding/idling/unauthorized-window rule evaluator.
  - `findmy/` — AirTag bridge ping parser.
- **Edge function webhooks**:
  - `hikvision-events` — verifies HMAC, parses ISAPI envelopes (linecrossing/intrusion/region_*/object_removal/tamper/motion/PIR/alarm_input), writes `camera_alerts`, hands off to dispatch-router.
  - `vehicle-track` — accepts OsmAnd GET + Traccar POST, writes `vehicle_track_points`, runs alert rules, dispatches high+ severity.
  - `asset-track` — accepts AirTag bridge POSTs, updates `asset_trackers.last_seen_at`.
  - `dispatch-router` — runs the dispatch evaluator and fans out: notify_*, fire_relay (Hik ISAPI), create_incident, dispatch_route. Persists `dispatch_events` for every step.
- **Operational compliance rules** (in `@stigg/compliance/operational/automation.ts`): asset-offline (24h/72h), low battery, vehicle alert backlog (7-day count), missed-tour trends. 9 new tests.
- **New schema 0006** — `nvr_systems`, `arming_schedules`, `linkage_rules`, `dispatch_routes`, `dispatch_events`, `vehicle_track_points`, `vehicle_alerts`, `guard_track_points`, `asset_trackers`, `asset_track_pings`. Plus `tour_scans.abnormal` + `abnormal_reason`. Full RLS + audit triggers.
- **Console pages**: Cameras & Automation (4-tab editor: cameras / NVR bridges / arming schedules / linkage rules with action JSON editor), Vehicles & GPS (live alerts), Asset trackers (recency-coloured), Dispatch (live event stream w/ ack).
- **Guard mobile**: abnormal-flag toggle on tour scans + inline camera capture (`<input capture="environment">`) + `shufflePatrol()` for randomized checkpoint order.
- **Client portal** picks up the approved marketing copy via `WelcomeBanner` on the dashboard.
- **Runbooks**: `RUNBOOK-hikvision.md` (NVR setup, HMAC, channels, relay), `RUNBOOK-traccar.md` (OEM/OBD/OsmAnd config, thresholds), `RUNBOOK-asset-tracking.md` (OpenHaystack bridge, AirTag pairing), `RUNBOOK-dispatch-rules.md` (three canonical rule patterns + three canonical routes), `MARKETING-COPY.md` (approved customer-facing language at three lengths).

### Added — initial `os-v2-rebuild`

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
