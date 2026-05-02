# Operating runbook — Northview Residential REIT (NV-2026-0001)

The first live customer contract on StiggOS. This document is the step-by-step.

## Contract at a glance

| Field | Value |
|---|---|
| Client | Northview Residential REIT |
| Contact | Dawn Collier — Regional Manager |
| Contract # | NV-2026-0001 |
| Form | Month-to-month MSA, 30 days' notice |
| Region | Fort McMurray, AB |
| Service line | Mobile patrol (guarding) |
| Pricing — summer (May–Oct) | $8,950 core + $950 MacDonald = **$9,900 + GST** |
| Pricing — winter (Nov–Apr) | $12,500 core + $1,650 MacDonald = **$14,150 + GST** |
| Schedule of rates | Static guard $39.40/hr + GST |
| Billing | Monthly in arrears, GST 5%, net 30 |
| Source-of-truth proposal | `Stigg_Northview_Seasonal_Proposal_Corrected_20260425_203420.pdf` |

## Sites (7 — six core + one optional add-on)

| Site | Address | Suites | Notes |
|---|---|---|---|
| Parkview I Apartments | 9501 Manning Avenue | 80 | core |
| Parkview II Apartments | 9501A Manning Avenue | 55 | core |
| 6 Nixon | 6 Nixon Street | 71 | core |
| 4 Nixon | 4 Nixon Street | 44 | core |
| 16 Saunderson | 16 Saunderson Avenue | 59 | core |
| 15 Saunderson | 15 Saunderson Avenue | 55 | core |
| MacDonald Place | 10126 MacDonald Avenue | 51 | optional add-on |

Total core suites 364 · with MacDonald 415.

## Patrol pattern

- **Summer (May–Oct):** 1 nightly visit per core site within the **Wave 1** window (19:30–23:30 local). MacDonald **alternating nights**.
- **Winter (Nov–Apr):** 2 nightly visits per core site — **Wave 1** (19:30–23:30) + **Wave 2** (00:30–03:30). MacDonald **nightly** at 1 visit.
- Times **randomized** within each wave's window. Supervisors may flex ±15 min for incidents, weather, or management requests.
- Two route flows alternate weekly (**Flow A** vs **Flow B**) — site visit order changes weekly so external observers can't predict our cadence.

The deterministic generator (`@stigg/scheduling`) produces the actual nightly schedule. Same seed → same schedule. Default seed for Northview is `${contract_id}:${period_start}` so regenerating mid-month is stable.

## Per-site checkpoints (6 each)

Front entrance · Lobby/mail · Parking area · Stairwell A (NFC) · Laundry room (NFC) · Rear/perimeter.

Tags installed on first onboarding visit. Photo + abnormal flag captured inline by the field PWA when something is off.

## One-shot setup — already done if you ran the seed

```bash
SUPABASE_URL=$URL \
SUPABASE_SERVICE_ROLE_KEY=$SR_KEY \
npm run seed:northview -- --org=<org_uuid> --dawn-password=<temp> --days=60
```

This creates: client, 7 sites with geofences + post orders, contract NV-2026-0001 with seasonal pricing + KPI targets, contract↔site links, 2 tour routes per site (Flow A / Flow B) with 6 checkpoints each, a Northview after-hours arming schedule, a linkage rule to email Dawn on missed-tour events, the Dawn Collier client-portal user, and 60 days of pre-generated shift demand.

Re-running is safe — every step is idempotent.

## Daily operations

### Floor manager / dispatcher

1. **08:00** — Check **Console → Command Center**. Confirm overnight shift completion ≥ 100% for Northview sites.
2. **Throughout day** — Triage **AI Intelligence** insights tagged `compliance` and `automation`. Address SSIA expiry / first-aid renewals before they bind scheduling.
3. **Anytime** — Open any incident at a Northview site to confirm Dawn was notified per linkage rule.

### Supervisor / scheduler

1. **Sunday evening** — **Console → Scheduling → Generate** for the upcoming week. The agent assigns guards to the demand rows seeded for Northview, respecting:
   - SSIA license validity through shift end
   - 10 hr min rest between shifts
   - Max 6 consecutive overnight shifts
   - Geo proximity to Northview cluster
2. **Monday morning** — Review the Scheduling page's **Rejected** panel. Common rejection: SSIA expiring before shift end → swap or renew.

### Field officers

1. Open **Stigg Field** PWA → **Shift** → tap "Clock in / out". GPS captured + validated against the site geofence.
2. Move through the route in the order shown by the assigned route (Flow A or B for the week).
3. At each checkpoint, **Tour scan** → token entered (NFC tap or QR scan); if anything abnormal, toggle the flag, write a one-liner reason, snap a photo. The scan auto-uploads, including offline (replays on reconnect).
4. Submit an **Incident** for any escalation. Voice-dictate; the Copilot structures it into a regulator-grade record.

## Monthly cycle

| Day | Task |
|---|---|
| 1st | Run **billing for previous month** (`Console → Invoices → Run billing for this month`). Auto-uses the seasonal slot — summer or winter. Invoice = `pricing_schedule.summer.monthly_cad` (or winter) + GST. |
| 1st–3rd | Issue invoice via Stripe. Webhook reflects status into StiggOS. |
| 1st | Auto KPI snapshot fires (`contract-kpi-snapshot` cron job). Or click **Refresh KPI snapshot** on the contract dashboard. |
| Within first 5 business days | Monthly review with Dawn Collier. Source-of-truth = `contract_kpi_snapshots` row for the period. |
| Within first 5 business days | Generate the next month's shift demand if not already seeded (re-run the seed with `--days=30`, idempotent). |

## KPI framework (per contract)

The Northview proposal defined five buckets — the dashboard shows all five. Computed by `contract-kpi-snapshot`:

1. **Patrol Delivery & Compliance** — `completion_pct` (target 100), no-shows. From `v_contract_patrol_delivery`.
2. **Asset Protection** — incidents in categories `vandalism / theft / trespass`. By severity, by category.
3. **Incident Response** — total / resolved / median resolution minutes.
4. **Recurring Risk & Hotspot Trends** — incidents by site + by hour band (00–06 / 06–12 / 12–18 / 18–24).
5. **Security-Related Maintenance Impact** — manual entries until the maintenance feed is wired.

Refresh anytime → recomputes from live data and upserts the snapshot.

## Dawn's client portal

Dawn signs in at `https://portal.stigg.ca` with the email + password you set during seed. RLS scopes everything she sees to Northview only:

- **Dashboard** — site count, open incidents, unpaid invoices.
- **My sites** — the 7 Northview sites with service-line badges.
- **Incidents** — all events at her sites, with severity + status.
- **Invoices** — monthly statements with the seasonal line items + Alberta GST 5%.
- **Ask in plain English** — natural-language Q&A over her own data ("show me incidents at the Parkview I in the last 30 days").

## Escalation paths

| Trigger | Where it lives | Default action |
|---|---|---|
| Tour-miss at a Northview site | linkage_rule `event_types=[tour_miss]` org-scoped, gated by Northview after-hours arming | Email Dawn (sent via dispatch-router → notify_email) |
| Critical incident at any site | Org-wide rule, no schedule | notify_push + create_incident + (if you wire it) escalation route |
| SSIA license expiring | Compliance Co-pilot `AB-SSIA-003` | High-priority insight; supervisor must renew or pull guard |

## Common scenarios

**A guard calls in sick at 22:00.** Open Scheduling → swap the assigned guard. The Schedule Agent re-validates SSIA + rest constraints. If no replacement exists in the eligible pool, the dispatch-router fires the on-call route (`dispatch_routes`).

**Dawn requests "more visibility at 6 Nixon for next two weeks."** Don't change the contract. Add a temporary site-scoped linkage rule with priority 10 (above the org default) demanding 3 visits/night to that site for the requested dates. Use the Schedule Agent to insert demand rows.

**Mid-contract, MacDonald is added permanently.** Already configured — `contract_sites.is_optional` flag. To "make it firm," set `contract_sites.is_optional=false`. The seasonal pricing already includes MacDonald in both summer and winter components.

**Damage claim from Dawn ("door broken Saturday night").** Forensic Search the incident: open `Console → AI Intelligence → Forensic Search` → "incidents at 6 Nixon last weekend with category vandalism or trespass". Pull tour scans from `tour_runs` to demonstrate that the patrol attended within its window. Export → email response.

## Termination / wind-down

Either party can terminate with 30 days' notice. To wind down in StiggOS:

1. `Console → Contracts → NV-2026-0001 → edit` → status `terminated`, end_date = effective date.
2. Future-dated shifts auto-cancel via the daily compliance scan (rule on contracts.status = terminated → cancel orphaned demand).
3. Stripe subscription cancelled by webhook (`customer.subscription.deleted`).
4. The portal user remains in read-only mode for 90 days so Dawn can pull historical reports, then is deactivated.

## What's NOT yet automated

- Static-guard hourly billing ($39.40/hr) when temporary coverage is added — currently treated as flat seasonal. Add a manual line item on those invoices for now.
- The maintenance-impact KPI bucket — manual entries until Northview's maintenance feed is wired.
- Monthly KPI PDF export — the dashboard renders Markdown; for now copy/paste into the meeting deck.
