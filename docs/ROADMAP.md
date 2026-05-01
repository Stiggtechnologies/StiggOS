# Roadmap

This is the working backlog. Items are sized in engineer-weeks; sprint-sized chunks (≤2 weeks) come first.

## Now (in flight)

| Item                                                  | Size  | Notes |
|-------------------------------------------------------|-------|-------|
| Console pages for Guards / Sites / Clients            | 1w each | Schema is in place; build CRUD on top of `supabase.from(…).select()` + RLS. |
| Realtime guard map on Command Center                  | 1w    | Add a Mapbox tile + bind to `shifts.actual_start/clock_in_geo`. `MAPBOX_PUBLIC_TOKEN` in `.env.example`. |
| Stripe billing + GST 5% invoice PDFs                  | 2w    | `invoices.line_items` already structured; renderer + Stripe webhook. |
| Daily `compliance-watcher` cron                       | 0.5w  | `pg_cron` or Supabase Scheduler. |

## Next (pre-production polish)

| Item                                                  | Size  | Notes |
|-------------------------------------------------------|-------|-------|
| Client Portal app                                     | 2w    | RLS already scoped; reuse `apps/console` shell. |
| LiveKit camera gateway + WebRTC tile in `apps/monitoring` | 3w | Replace placeholder camera tile with a real stream. |
| Talk-down TTS + audio relay                           | 1w    | Records into `talkdown_events`. |
| Body-cam ingest pipeline                              | 3w    | Trickle-upload, transcribe, embed → `incident_evidence` w/ chain-of-custody. |
| Mobile satellite-fallback for remote oil-sands sites  | 2w    | Iridium/Garmin inReach SDK; gates lone-worker check-ins. |

## Later

| Item                                                  | Notes |
|-------------------------------------------------------|-------|
| BC `Security Services Act` + Ontario `PSISA` plug-ins | One file each in `packages/compliance/regions/`. |
| Indigenous JV partner billing splits                  | `partners.contract_terms` already typed; add ledger. |
| CAD radio integration                                 | Motorola WAVE PTX or P25 dispatch link. |
| Sales/RFP agent                                       | Extension of `sales-assessment` w/ contract-corpus RAG. |

## Far future (not committed)

* On-vehicle ANPR for transport runs.
* On-camera silicon (Hailo / Ambarella) edge inference w/ alert ingestion via MQTT.
* Voice-first dispatcher copilot ("Stigg, send a mobile to Northview 5").
