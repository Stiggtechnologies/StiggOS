# Runbook — Security incident response

For real-world security incidents at a client site (NOT for software/IT incidents — those use the IT/Cyber surface).

## 1. Receive the alert

Triggers:
- Camera AI alert (Monitoring app)
- Guard panic from the field PWA
- Lone-worker missed check-in
- Client phone call
- 911 dispatch escalation

## 2. Within 60 seconds

- [ ] Acknowledge the alert in the **Monitoring** app or **Command Center**.
- [ ] Confirm GPS / camera / guard radio if available.
- [ ] Decide: is this a real event? (false-positive rate is non-zero on AI cameras — operator judgment is the gate.)
- [ ] If real, escalate the alert in the triage drawer → creates an `incidents` row.

## 3. Within 5 minutes

- [ ] Dispatch a mobile patrol if no on-site guard.
- [ ] Notify the client primary contact via `notifications` (or phone if critical).
- [ ] Open Incident Copilot — paste/dictate what's known.
- [ ] If life-threatening or violent: call 911. Record `police_called=true`, capture file number.

## 4. During response

- [ ] Update incident status as it changes (`open` → `investigating` → `resolved`).
- [ ] Capture evidence into `incident_evidence`. Every upload must come with `sha256` and a `captured_by` user_id.
- [ ] Record every external touchpoint in `evidence_custody` (police review, lawyer, client viewing).

## 5. Resolution

- [ ] Set `status = resolved`, `resolved_at = now()`, fill `resolution_summary`.
- [ ] If client-impacting: send the formal incident report from the console (email + PDF link).
- [ ] If it involves personal data (e.g. employee theft, medical) → follow the [PIPEDA breach runbook](./RUNBOOK-pipeda-breach.md).

## 6. Post-incident review

Within 7 days:
- [ ] Compliance Co-pilot scan (auto-runs daily — no action).
- [ ] If repeat at the same site → schedule a Sales Assessment for upgraded coverage.
- [ ] Pattern → update post orders for that site.

## Severity guide

| Severity  | Examples                                                | SLA  |
|-----------|---------------------------------------------------------|------|
| critical  | armed person, fire, life-threatening medical, weapon    | 0–5m |
| high      | active breach, forcible entry attempt, vehicle ram      | 5–15m |
| medium    | unauthorized presence, alarm + signs of attempt         | 15–60m |
| low       | nuisance, maintenance, false alarm with explanation     | next shift |

## What NOT to do

- Do NOT delete an incident row. Always close (`status=closed`).
- Do NOT modify `incident_evidence.storage_url` or `sha256` after capture — chain-of-custody depends on the SHA staying constant.
- Do NOT enter PII not directly observed (no fabricated plates, names, demographics).
