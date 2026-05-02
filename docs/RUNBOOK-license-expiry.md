# Runbook — Alberta SSIA license expiry

Alberta's **Security Services and Investigators Act** (SSIA) requires every active guard to hold a valid license. Working without one is an offence; scheduling one is a regulatory and insurance liability.

## How the system flags it

`compliance-watcher` runs daily (set up in `0005_storage_and_cron.sql`):

| Days to expiry | Rule ID      | Severity  | Action       |
|----------------|--------------|-----------|--------------|
| Already expired| AB-SSIA-002  | critical  | Block scheduling |
| 0–14 days      | AB-SSIA-003  | high      | Open renewal task |
| 15–30 days     | AB-SSIA-003  | medium    | Open renewal task |
| Missing entirely | AB-SSIA-001 | high     | Block scheduling |

## On a `medium` (15–30 days)

1. Open the guard's record in **Console → Guards**.
2. Confirm the renewal application is in flight at AB Justice & Solicitor General (typical 4–6 wk lead time).
3. If not, give the guard the renewal form and 5 business days to start.

## On a `high` (0–14 days)

1. Pre-book replacement coverage for any shifts after the expiry date — `Console → Scheduling` will *not* let you assign past expiry; treat that as the canary.
2. Confirm renewal status with AB Justice — call the licensing office if no movement.
3. If renewal will not land in time → mark guard `status='on_leave'` until the new license is in hand.

## On a `critical` (already expired)

1. **Pull the guard from rotation immediately** — set `status='inactive'`.
2. Replace any in-progress shift today.
3. Investigate root cause: missed task, communication failure, system bug.
4. Document in the `audit_log` how long they worked past expiry, if any.
5. Notify the org owner.

## When the renewal lands

1. Update `guards.ssia_license_number` and `ssia_license_expiry`.
2. Re-run compliance scan from the AI Intelligence page.
3. The relevant insights in `ai_insights` will be cleared automatically when the rule no longer fires (next daily scan).

## Edge cases

- **Out-of-province transfer**: SSIA does not auto-recognize Ontario PSISA / BC SIR. Treat as missing license.
- **Indigenous JV partner staff**: subcontractor guards still need valid SSIA. The `partners` link does not change the rule.
- **Special-event one-day permits**: not implemented. Today these are entered as a normal license with a 1-day expiry.
