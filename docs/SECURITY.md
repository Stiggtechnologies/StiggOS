# Security & Compliance Notes

This document captures the security and compliance posture *as built*. Statements that are aspirational rather than implemented are flagged with **[planned]**.

## Tenant isolation

* Every domain table carries `org_id`; every domain table has RLS enabled with `FORCE ROW LEVEL SECURITY`.
* Policies derive the caller's org from `user_profiles.org_id` keyed on `auth.uid()`. See `supabase/migrations/0002_rls.sql`.
* `role='client'` users are further scoped to their own `client_id`.

## Audit log

* `audit_log` is append-only with RLS read-scoped to `owner`/`admin` of the org.
* Every mutation on tenant tables fires `audit_row_change()` capturing actor, role, IP, request ID, and full row before/after.
* No `INSERT`/`UPDATE`/`DELETE` policies exist on `audit_log` — only the trigger writes.

## Auth

* Supabase Auth (email + password today; magic-link, SSO, MFA **[planned]**).
* JWT bearer required on all edge functions; `_shared/auth.ts` resolves the user profile and returns scoped clients.
* RLS still applies via the user-scoped client; service-role client used only for narrowly scoped writes (`ai_sessions` logging, audit).

## Secrets

* `ANTHROPIC_API_KEY` lives in Supabase project secrets, never in client code.
* `.env.example` documents every required variable; `.env` is `.gitignore`d.

## PIPEDA

* `privacy_breach_register` is the system of record. The federal rule (PIPEDA s.10.1) is enforced by `packages/compliance/src/federal/pipeda.ts`.
* Incident narration is kept verbatim *and* its AI-structured fields are kept — guards' original words are never lost.
* Incident Copilot prompt forbids fabricating personal identifiers.
* **[planned]** Per-jurisdiction data-residency option (Canada-only Supabase region).

## Alberta-specific

* `orgs.ssia_license` for the Alberta SSIA (Security Services and Investigators Act) operator license.
* `guards.ssia_license_number/expiry` checked daily by `compliance-watcher`.
* OHS Code Part 28 (Working Alone) checked when `sites.remote = TRUE`.
* WCB number tracked per org; per-claim workflow **[planned]**.

## AI safety

* All agents emit structured outputs (Zod-validated) — never raw text dropped into the database.
* Schedule Agent proposals are re-validated by code before insert — the model is a hint, code is law.
* Cost telemetry stored in `ai_sessions` per surface for budget alerting.
* Prompt cache markers on the static system block reduce drift across turns and cost.
