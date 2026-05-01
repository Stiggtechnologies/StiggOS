# StiggOS

AI-native operating system for **Stigg Security Inc.** — Alberta's multi-line security operator (Fort McMurray · Calgary · High River · Edmonton · Red Deer · Grande Prairie).

Covers all five product lines listed on stigg.ca: **Security Guards · Surveillance & Alarms · Virtual Security Guard · IT/Cybersecurity · Secure Transport** — under one schema, one auth, one AI runtime.

> **Honest scope.** A real production ERP for a $100M security operator is a 12–18 month, 20+ engineer programme. This repo ships the *foundation that gets you there*: a unified data model, the AI runtime that turns "AI-first" from marketing into product, four working agents, three working surfaces, and the production primitives (CI, Docker, RLS, audit log, evals) so the next sprint extends rather than rewrites.
>
> See **[Status](#status-whats-real-vs-stubbed)** below for what's wired end-to-end vs. scaffolded.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Surfaces                                    │
│ ┌────────────┐ ┌──────────────┐ ┌────────────────┐ ┌─────────────────┐  │
│ │   Console  │ │ Guard Mobile │ │  Monitoring    │ │ Client Portal   │  │
│ │ (staff)    │ │   (PWA)      │ │  (VSG ops)     │ │  (roadmap)      │  │
│ └─────┬──────┘ └──────┬───────┘ └────────┬───────┘ └────────┬────────┘  │
└───────┼───────────────┼──────────────────┼──────────────────┼───────────┘
        │               │                  │                  │
        ▼               ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Supabase Edge Functions                            │
│   incident-copilot · schedule-agent · compliance-watcher                 │
│   forensic-search · sales-assessment                                     │
└────┬─────────────────────────────────────────────────────────────┬──────┘
     │                                                             │
     ▼                                                             ▼
┌──────────────────────────────┐               ┌─────────────────────────┐
│ Pluggable LLM provider       │               │  Supabase Postgres      │
│   • Anthropic Claude         │               │   • RLS on every table  │
│   • OpenAI GPT               │               │   • Audit log triggers  │
│   • Google Gemini            │               │   • PostGIS · pgvector  │
│   • Open-source via OpenAI-  │               └─────────────────────────┘
│     compatible (Ollama, vLLM,│
│     Groq, Together, …)       │
│   • Mock (offline)           │
└──────────────────────────────┘
```

### Why this shape

* **One Postgres** with PostGIS (geofencing) + pgvector (forensic semantic search) covers every domain. Cross-service-line queries ("which clients have both guards and IT contracts at oil-sands sites?") are SQL, not microservice choreography.
* **Edge Functions** keep the LLM key server-side and run alongside the DB — no separate Node service, no cold-start gateway, no extra hosting bill.
* **Pluggable LLM provider** in `@stigg/ai` lets the same agent run on Claude, GPT-4o, Gemini, or any open-source model served via an OpenAI-compatible endpoint (Ollama, vLLM, llama.cpp, Groq, Together, Fireworks, OpenRouter…). Provider is a config change, not a code change. See [docs/LLM-PROVIDERS.md](docs/LLM-PROVIDERS.md). The whole stack also runs locally with no key via the deterministic mock provider.
* **Plug-in compliance engine** in `@stigg/compliance` cleanly separates Alberta SSIA / OHS / WCB / PIPEDA rules from product code, so adding BC or Ontario is a new file, not a refactor.

---

## Layout

```
stigg-os/
├── apps/
│   ├── console/         Staff workspace — Command Center, AI Intelligence, Incident Copilot,
│   │                    Scheduling, Compliance, Forensic Search, Incidents (working)
│   │                    + Guards, Sites, Clients, Sales Pipeline, … (placeholders)
│   ├── guard-mobile/    Field PWA — geofenced clock-in, tour scan, voice-to-incident, panic
│   ├── monitoring/      Virtual Security Guard ops — camera grid, alert stream, triage drawer
│   └── client-portal/   (roadmap) — customer self-service
├── packages/
│   ├── ai/              Provider-agnostic LLM harness (Claude / GPT / Gemini / OSS / mock), agents, tools, prompt caching
│   ├── compliance/      Deterministic rules: Alberta SSIA / OHS / PIPEDA
│   ├── shared/          Zod-validated types matched to the schema
│   └── ui/              (roadmap) — shared design system
├── supabase/
│   ├── migrations/      0001_foundation · 0002_rls · 0003_audit · 0004_seed_dev
│   └── functions/       5 edge functions sharing _shared/{auth,cors,llm,agent-loop}.ts
├── infra/docker/        Dockerfile + nginx config for the console
├── tests/e2e/           Playwright smoke tests
└── .github/workflows/   CI: typecheck, unit, AI eval (mock), e2e, db-validate (Postgres+PostGIS)
```

---

## Quick start

```bash
# 1. Install
npm install

# 2. Local Supabase (Postgres + Studio + Edge Functions runtime)
npx supabase start               # boots a local stack
npx supabase db reset            # applies 0001..0004 migrations

# 3. Set env (copy and edit)
cp .env.example .env

# 4. Run a surface
npm run dev:console              # http://localhost:5173
npm run dev:guard                # http://localhost:5174
npm run dev:monitoring           # http://localhost:5175
```

The console runs **without any LLM key** — `@stigg/ai`'s mock provider returns deterministic structured outputs so you can demo Incident Copilot, Scheduling, AI Intelligence, etc. To hit a real model, set one set of vars in `.env`:

```bash
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-…

# OpenAI GPT
OPENAI_API_KEY=sk-…

# Google Gemini
GOOGLE_API_KEY=…

# Open-source — any OpenAI-compatible server (Ollama example)
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL_AGENT=llama3.3:70b-instruct
OPENAI_MODEL_FAST=llama3.1:8b-instruct
```

Auto-detect picks the first one that's set. Mirror to Supabase secrets for edge functions:
`supabase secrets set ANTHROPIC_API_KEY=…` (or whatever you used).

See [docs/LLM-PROVIDERS.md](docs/LLM-PROVIDERS.md) for vLLM, Groq, Together, Fireworks, OpenRouter, llama.cpp, LM Studio, and the supported open-source models.

---

## The five service lines (wired into the data model)

| Line                       | Tables                                                                                  | AI surfaces                                                  |
|----------------------------|-----------------------------------------------------------------------------------------|--------------------------------------------------------------|
| Security Guards            | `guards`, `shifts`, `tour_routes/checkpoints/runs/scans`, `lone_worker_checkins`        | Schedule Agent, Compliance Co-pilot, Incident Copilot        |
| Surveillance & Alarms      | `cameras`, `camera_alerts`, `talkdown_events`                                           | (Camera anomaly classifier — model owned externally)         |
| Virtual Security Guard     | shared with Surveillance + `incidents` (escalation linkage)                             | Monitoring app + Incident Copilot                            |
| IT/Cybersecurity           | `it_assets`, `it_tickets`, `privacy_breach_register`                                    | (PIPEDA watcher — federal rules in `@stigg/compliance`)      |
| Secure Transport           | `vehicles`, `transport_runs`, `transport_custody_events`                                | (Run-status classifier — roadmap)                            |

Every tenant table has `org_id` + RLS + audit-trigger. Clients can self-serve via `user_profiles.role='client'` which scopes them to one client account.

---

## The four working AI agents

All four use the same harness (`packages/ai/src/agent.ts`) → tool-use loop with prompt caching, structured Zod-validated outputs, automatic session/usage logging.

1. **Incident Copilot** (`supabase/functions/incident-copilot`) — guard narration → structured incident with who/what/when/where/how + category + severity + AI confidence. PIPEDA-aware (no fabricated PII).
2. **Schedule Agent** (`supabase/functions/schedule-agent`) — generates next-week shift proposals respecting **hard** constraints (license validity, no overlap, fatigue, certifications). Code re-validates before insert — model is a hint, code is law.
3. **Compliance Co-pilot** (`supabase/functions/compliance-watcher`) — runs the deterministic rules in `@stigg/compliance` (Alberta SSIA expiry, OHS first-aid, PIPEDA breach lag), then the model triages & prose-ifies each finding with citations to source rows.
4. **Forensic Search** (`supabase/functions/forensic-search`) — natural language → structured search plan over `incidents`/`shifts`/`camera_alerts`. RLS keeps results scoped to the caller.

Plus a 5th: **Sales Assessment** (`supabase/functions/sales-assessment`) productizes the "free AI Security Assessment" already advertised on stigg.ca — questionnaire in, recommended service mix + estimate + risks-flagged out.

---

## Status — what's real vs stubbed

| Capability                                                  | Status        |
|-------------------------------------------------------------|---------------|
| Multi-tenant Postgres schema (orgs, RBAC, all 5 service lines) | ✅ shipped |
| RLS policies on every tenant table                          | ✅ shipped     |
| Audit-log trigger on every mutation                         | ✅ shipped     |
| Alberta SSIA / OHS / PIPEDA rules engine                    | ✅ shipped     |
| Multi-provider LLM harness — Claude / GPT / Gemini / OSS (Ollama, vLLM, Groq, …) / mock — tool use, prompt caching, normalized format | ✅ shipped     |
| 5 Edge Functions for the agents                             | ✅ shipped     |
| Console: Command Center (realtime), Incident Copilot, AI Intelligence (real), Scheduling, Compliance, Forensic Search, Incidents | ✅ shipped     |
| Guard mobile PWA: geofenced clock-in, tour scan, voice-to-incident, panic, offline queue | ✅ shipped     |
| Monitoring app: camera grid, live alert stream, triage drawer, talk-down composer | ✅ shipped     |
| GH Actions CI: typecheck / unit / AI eval / e2e / db-validate | ✅ shipped     |
| Docker + nginx for the console                              | ✅ shipped     |
| Console pages: Guards / Sites / Clients / Sales Pipeline / Contracts / Invoices / Audit Log / Messages / Settings | 🟡 placeholder routes (schema in place) |
| Camera streaming (RTSP/WebRTC media gateway)                | 🟡 schema only — needs LiveKit/Janus |
| Talk-down audio delivery to site speaker                    | 🟡 schema only — TTS+gateway pending |
| Secure Transport telemetry & dual sign-off UI               | 🟡 schema only — UI pending |
| IT/Cyber MSP integrations (SentinelOne / CrowdStrike feeds) | 🟡 env keys reserved — adapters pending |
| Client portal app                                           | 🟡 RLS scoped, app not yet built |
| Marketing/CMS unified into OS (lead scoring, newsletter, blog) | 🟡 schema for `leads`/`security_assessments` in place |
| Stripe billing + GST-aware invoicing                        | 🟡 `invoices` table in place — Stripe wiring pending |
| Full body-cam CV pipeline                                   | 🔴 future |
| CAD radio integration                                       | 🔴 future |
| Multi-province compliance (BC SIR / Ontario PSISA / etc.)   | 🔴 plug-in shape ready in `packages/compliance/regions/` |

---

## Production deployment notes

* **Secrets.** `supabase secrets set ANTHROPIC_API_KEY=…` (or `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_BASE_URL`) on the project. Never commit keys. To self-host the model entirely, deploy Supabase + your OSS server in the same VPC and set `OPENAI_BASE_URL` to its internal hostname.
* **CSP.** `infra/docker/console-nginx.conf` ships sensible defaults (`X-Frame-Options DENY`, narrow Permissions-Policy). Tighten the CSP per your CDN.
* **Cost telemetry.** Every agent call logs to `ai_sessions` (input/output/cache tokens, cost). Surface this on a billing dashboard before you scale.
* **Compliance scan cadence.** Schedule `compliance-watcher` daily (Supabase cron / pg_cron). Today it's manual.
* **PIPEDA.** `privacy_breach_register` is the system of record. The PIPEDA rule fires at 3 days from detection — adjust per legal counsel.
* **Backups.** Supabase managed backups + a `pg_dump` cron is the minimum bar for incident-evidence integrity.

---

## Roadmap (next 90 days, suggested)

1. **Wire client portal app** (RLS already gates everything by `client_id`).
2. **Stripe + GST invoicing** — generate invoices from `shifts × bill_rate`; Alberta GST 5%.
3. **Camera media gateway** — LiveKit cluster; talk-down via WebRTC.
4. **Body-cam ingest** — trickle-upload over LTE with pgvector embeddings on transcripts for forensic search.
5. **Marketing → Sales unification** — replace the standalone marketing site with a server-rendered surface that writes leads directly into `leads`, scored by `sales-assessment`.
6. **BC + Ontario compliance plug-ins** — when expansion happens, drop a file in `packages/compliance/regions/`.

