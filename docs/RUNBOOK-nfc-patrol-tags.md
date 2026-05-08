# Runbook — NFC patrol tags

How to deploy NFC checkpoint tags for a site, what to print on the sticker, and
how the server validates each tap. Pairs with migrations `0025_patrol_nfc.sql`
(Phase 1: NFC + radius validation) and `0026_patrol_phase2.sql`
(Phase 2: missed-checkpoint cron, photo-required, randomized route order).

## 1. The flow at a glance

```
NFC tag (URL)  →  guard's phone  →  Stigg field PWA  →  record_patrol_scan RPC
                                                       │
                                                       ├─→ tour_scans (accepted)
                                                       └─→ patrol_exceptions (flagged)
```

The tag itself is **passive**. It stores ~30 bytes — a URL like
`https://app.stigg.ca/p/NW-1001`. The phone reads it, opens the URL, the PWA
captures GPS, and submits to the RPC. **No code, no GPS, no shift identity
ever lives on the tag.** Tags are interchangeable between sites; the only
state is the unique checkpoint code.

## 2. URL format on the tag

Preferred — short, fits any NTAG (213/215/216) with room to spare:

```
https://app.stigg.ca/p/<CODE>
```

Verbose — also accepted:

```
https://app.stigg.ca/patrol/checkin?checkpoint_id=<CODE>
https://app.stigg.ca/patrol/checkin?code=<CODE>
```

`<CODE>` is the human-readable checkpoint identifier — see §4.

## 3. Recommended hardware

| Chip      | User memory | Use when                                                  |
| --------- | ----------- | --------------------------------------------------------- |
| NTAG213   | 144 bytes   | Default. Plenty of room for our URLs (≈30 bytes).         |
| NTAG215   | 504 bytes   | If you want headroom for future URL changes.              |
| NTAG216   | 888 bytes   | Overkill for our URLs. Choose if reusing existing stock.  |

Disc, sticker, or epoxy form factors are all fine. For outdoor checkpoints
(parkades, rear doors) prefer **PET on-metal** stickers — bare PVC tags
detune badly when stuck on metal door frames.

For higher-security sites consider **NTAG 424 DNA** with SUN authentication.
The migration's GPS + shift + radius validation already defeats trivial
cloning, but DNA tags add a rotating cryptogram if your threat model
warrants it.

## 4. Checkpoint code conventions

Codes are unique **per tenant** (enforced by `tour_checkpoints_org_code_uniq`).
Inside a tenant, pick a short prefix per site so the table-pasted output is
readable.

```
NW-1001    Northview · Front entrance
NW-1002    Northview · Rear door
NW-1003    Northview · Mechanical room
NW-1004    Northview · Parkade L1
NW-1005    Northview · Parkade L2
NW-1006    Northview · Garbage enclosure
```

Don't put guard names, dates, or anything time-sensitive in the code — the
sticker is on the wall for years.

## 5. Programming a batch

Generate the rows in the database first (so the codes are reserved and
visible to the supervisor dashboard), then write the same URLs onto tags.

### 5a. Seed the database

Author a CSV like:

```csv
ordinal,label,lat,lng,radius_m
1,Front entrance,56.7267,-111.3790,50
2,Rear door,56.7271,-111.3790,50
3,Mechanical room,56.7269,-111.3792,40
4,Parkade L1,56.7268,-111.3795,75
5,Parkade L2,56.7268,-111.3796,75
6,Garbage enclosure,56.7264,-111.3789,40
```

Then:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npm run seed:checkpoints -- \
    --route=<route_uuid> \
    --prefix=NW \
    --start=1001 \
    --base-url=https://app.stigg.ca \
    --csv=./northview-checkpoints.csv > tags.tsv
```

Output (`tags.tsv`) is tab-separated:

```
code        url                                    label              ordinal
NW-1001     https://app.stigg.ca/p/NW-1001         Front entrance     1
NW-1002     https://app.stigg.ca/p/NW-1002         Rear door          2
...
```

Re-running with the same prefix/start updates labels, geo, and radius — the
unique constraint on `(org_id, checkpoint_code)` makes it idempotent.

### 5b. Write the tags

Pick one:

- **Phone, free, fastest** — install **NXP TagWriter** (Android) or **NFC Tools**
  (iOS, Android). Choose *Write → URL/URI*, paste the URL, tap each tag. Lock
  the tag (read-only) after writing — uncheck this if you want to re-flash
  later, but locked is safer for production.
- **Bench encoder** — for runs of >100, a USB encoder (ACR122U, NFC Reader/Writer
  Pro) plus a CSV is faster. Most encoder apps accept the same `tags.tsv`.

### 5c. Print + label

The QR code printed alongside the NFC tag should encode the **same URL**.
Most label printers (Brother QL, Zebra) will accept the URL directly via
their browser preview UI; for batch printing use a tool that takes the
`tags.tsv` columns.

A standard sticker layout:

```
┌─────────────────────────┐
│  STIGG · NW-1001        │
│  ┌─────┐                │
│  │ NFC │  Front         │
│  │ ◉◉◉ │  entrance      │
│  └─────┘                │
│  ┌─────┐                │
│  │ QR  │  Tap or scan   │
│  └─────┘                │
└─────────────────────────┘
```

## 6. What the server validates

Every tap goes through `record_patrol_scan`. The function returns either
`{status: 'accepted'}` and writes a row to `tour_scans`, or
`{status: 'flagged', kind}` and writes a row to `patrol_exceptions`. There
is no third option — every tap is recorded somewhere.

| Rule              | Trigger                                                        | Where it lands         |
| ----------------- | -------------------------------------------------------------- | ---------------------- |
| `unauthenticated` | No JWT                                                         | nothing (RPC rejects)  |
| `unknown_code`    | Code not in this org's `tour_checkpoints`                      | `patrol_exceptions`    |
| `inactive_checkpoint` | `tour_checkpoints.is_active = false`                       | `patrol_exceptions`    |
| `no_guard_record` | Signed-in user has no row in `guards`                          | `patrol_exceptions`    |
| `no_active_shift` | Guard has no in-progress / scheduled shift right now           | `patrol_exceptions`    |
| `wrong_site`      | Guard is on shift, but at a different site                     | `patrol_exceptions`    |
| `out_of_window`   | Scan is outside `scheduled_start ±30min` … `scheduled_end ±30min` | `patrol_exceptions` |
| `low_gps_accuracy`| `accuracy_m > radius * 2` — fix is too coarse to trust          | `patrol_exceptions`    |
| `out_of_range`    | `ST_Distance(checkpoint, scan) > allowed_radius_m`             | `patrol_exceptions`    |
| `duplicate`       | Same checkpoint, same shift, within 60s of a prior accepted scan | `patrol_exceptions`  |
| (none)            | All rules pass                                                 | `tour_scans`           |

Tunables (currently hard-coded in the RPC):

- 30-minute pre/post buffer on shift windows
- 60-second duplicate window
- 100m default radius (per-checkpoint override via `allowed_radius_m`)

## 7. Supervisor exception review

Pending exceptions appear in **Console → Patrols → Flagged scans**. A
supervisor can:

- **Reject** — guard fraud / mistaken tap. Row stays in `patrol_exceptions`
  with `status='rejected'`.
- **Approve (convert)** — promotes the row to a real `tour_scans` entry,
  lazy-creates a `tour_run` if needed, and links the original exception via
  `promoted_scan_id`. Use this when the auto-validator was wrong (e.g. GPS
  drift in a parkade, dispatch forgot to assign the shift).

Approving requires a checkpoint and a shift — if either is missing the RPC
returns `Cannot convert: missing checkpoint or shift.`

## 8. Troubleshooting

**Tap opens browser but app doesn't load.** Make sure the guard is on the
production guard-mobile host (`https://app.stigg.ca`). The Vercel rewrite at
`apps/guard-mobile/vercel.json` sends every path to `index.html`; the React
app then routes `/p/<code>` to the NFC landing.

**"Code … is not a registered checkpoint."** Either the code wasn't seeded
(check `tour_checkpoints` for `(org_id, checkpoint_code)`) or the URL went
to the wrong tenant. Codes are tenant-unique — a code from another org is
indistinguishable from a typo.

**"You are 95m from the checkpoint."** Increase `allowed_radius_m` for the
specific checkpoint, or move the tag closer to the GPS reference point. For
parkade interiors, raise the radius to 75–100m and accept the looser bound.

**"GPS accuracy ±200m too imprecise."** The phone returned a fix worse than
2× the radius. Likely indoor GPS only — guard should rescan after stepping
outside or wait a few seconds for a tighter fix.

**Offline taps.** The PWA queues the RPC call locally and replays on
reconnect. Validation happens at replay time, so an offline tap from outside
the radius will *still* land in `patrol_exceptions` once it syncs — the
client doesn't pre-judge it.

## 9. Photo-required checkpoints (Phase 2)

Set `tour_checkpoints.photo_required = TRUE` for any checkpoint that needs a
photo every patrol round (mechanical rooms, parkade levels you can't see
from the entrance, etc.). The behavior:

- The tap is recorded as normal — `record_patrol_scan` does not block on
  the photo.
- The RPC response includes `photo_required: true, has_photo: false`.
- The NFC landing page prompts the guard with **"Photo required"** and a
  camera button. The photo uploads to the `evidence` bucket at
  `{org_id}/scan/{scan_id}/{filename}` and is recorded in
  `tour_scan_attachments` (existing table from `0019_field_capture.sql`).
- If the upload fails (network drop), it queues in IndexedDB and replays
  next time the app loads online. The scan_id link survives across
  sessions.
- Supervisors see scans without their required photo by joining
  `tour_scans` to `tour_scan_attachments` — a scan with `photo_required` and
  zero photo attachments is the auditable gap.

To enforce photo-required at write time (RPC rejects scans missing a photo),
that's a Phase 3 decision — the current behavior is "soft requirement" so
guards aren't blocked when they don't have a free hand.

## 10. Missed-checkpoint cron (Phase 2)

Every 15 minutes (UTC, set in `0026_patrol_phase2.sql`), pg_cron POSTs to
the `patrol-missed-checkpoints` Edge function. The function:

1. Calls `patrol_overdue_runs()` — returns in-progress `tour_runs` past
   their route's `expected_duration_min` with at least one un-scanned
   active checkpoint, and whose `alerted_overdue_at IS NULL`.
2. Inserts one notification per (run, ops staff member) into the
   `notifications` table with `topic='patrol.run_overdue'` and a payload
   carrying the run, site, route, guard, and overdue minutes.
3. Calls `patrol_record_overdue_alerts(run_ids)` to mark each run alerted
   so the next pass doesn't re-notify.

Severity heuristic in the payload:
- `medium` when overdue ≤ 60 minutes
- `high`   when overdue > 60 minutes

Sources of "expected duration":
- `tour_routes.expected_duration_min` (per-route override)
- Fallback default of **90 minutes** when the route value is null

Console operators see overdue runs in **Patrols → Overdue runs** as the
top-of-page red panel, populated by `patrol_overdue_runs_for_org()` (the
tenant-scoped sibling of the cron's RPC).

To tune sensitivity: set a shorter `expected_duration_min` on a tight
contractual route (e.g. 45 min for a small residential building), or a
longer one on sites with deliberate dwell time built in.

## 11. Randomized route order (Phase 2)

The guard's site briefing now displays tonight's checkpoints in a randomized
order seeded by `shift_id` (`seedFromString(shift.id)` in
`apps/guard-mobile/src/lib/patrol-order.ts`). This means:

- The same shift always shows the same plan on refresh — guards aren't
  surprised by a re-shuffle mid-patrol.
- A different shift (next night) shows a different plan — observers can't
  predict the next checkpoint by watching one or two patrols.
- Physical taps still record actual progress; the UI's order is a
  recommendation, not an enforcement.

The shuffle is Fisher–Yates seeded by an LCG, all in
[apps/guard-mobile/src/lib/patrol-order.ts](../apps/guard-mobile/src/lib/patrol-order.ts).
Tested in [apps/guard-mobile/test/patrol-order.test.ts](../apps/guard-mobile/test/patrol-order.test.ts).
