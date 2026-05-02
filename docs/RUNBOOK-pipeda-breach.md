# Runbook — PIPEDA privacy breach

The federal **Personal Information Protection and Electronic Documents Act** (PIPEDA) governs how Stigg handles personal information of clients, employees, and the public. A breach with **real risk of significant harm (RROSH)** triggers mandatory reporting to the Office of the Privacy Commissioner of Canada (OPC) and to affected individuals.

This runbook is a checklist, not legal advice. Engage privacy counsel for any breach involving > 50 records, sensitive categories, or unknown scope.

## Hour 0 — detection

1. Open **Console → Compliance** and create a `privacy_breach_register` row:
   - `detected_at` = now
   - `description` = what's known
   - `data_categories` = e.g. `['name','address','date_of_birth','footage']`
   - `records_affected` = best estimate; update later
2. Contain: revoke leaked tokens, rotate credentials, take exposed surfaces offline. Document each step in `containment_actions`.

## Hour 1–4 — RROSH assessment

Three factors per OPC guidance:
1. **Sensitivity** of the data (footage of minors, financial info, biometrics → high).
2. **Probability of misuse** (lost laptop in alley vs. attacker exfiltrating → high if targeted).
3. **Number of individuals** and ease of identification.

If ANY factor is high → **RROSH = yes** → mandatory notification.

Stigg's deterministic compliance rule (`PIPEDA-NOTIF`) flags any breach without notification within 3 days as `critical`. Aim to file before that.

## Hour 4–24 — notify

If RROSH:
- [ ] Submit OPC report (Form PB) — set `opc_reported = true`, `opc_reported_at = now()`, attach reference number.
- [ ] Notify each affected individual directly. If contact info is part of the breach, public notice may substitute (rare).
- [ ] Notify any other org that can reduce harm (banks for financial data, employer for employee data).
- [ ] Set `notification_sent = true`, `notification_sent_at = now()`.

## Day 1–7 — investigation

- [ ] Root cause analysis — was it credential, software, physical, third-party?
- [ ] Update the `privacy_breach_register` row with findings.
- [ ] Status progression: `investigating` → `contained` → `reported` → `resolved`.

## Day 30+ — record retention

PIPEDA requires breach records to be kept **24 months minimum**. The `privacy_breach_register` table never deletes; an OPC audit can ask for any breach in the last 2 years.

## What NOT to do

- Do NOT delete the breach row. Mark `status='resolved'` instead.
- Do NOT post breach details publicly before notifying affected individuals.
- Do NOT estimate "low impact" without documentation — the OPC asks for the assessment, not just the conclusion.

## Drills

The `PIPEDA-DRILL` rule reminds you to run a tabletop drill every quarter. Log the drill as a normal `privacy_breach_register` row with `description` starting `[DRILL]`. The compliance scanner counts those toward the cadence requirement.
