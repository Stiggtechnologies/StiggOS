# Runbook — Hikvision NVR / HikCentral integration

This integrates a Hikvision NVR (or HikCentral Professional) into StiggOS so that AI-detected events trigger StiggOS dispatch logic — replacing what HikCentral's onboard alarm tree does, but vendor-agnostic and with proper time-based + rotating dispatch.

## What you get

- Hikvision linkage events (`linecrossing`, `intrusion`, `region_entrance`, `tamper`, `motion`, `pir`, `alarm_input`, `object_removal`, …) flow into `camera_alerts`.
- Each event runs through the **arming schedule** (when?) and **linkage rule** (what?) engine in `packages/dispatch`.
- Actions execute: notify push/SMS/email, fire NVR relay (siren/strobe/gate), talk-down, escalate to a rotating dispatch route (guard → monitoring desk → police).
- All decisions logged to `dispatch_events` for audit + analytics.

## Networking

Two patterns:

| Pattern | Setup | Trade-off |
|---|---|---|
| **NVR posts directly** | NVR's HTTP Listener targets the public Supabase Edge Function URL. | Easiest. NVR must reach the public internet. |
| **Bridge box** | Run a tiny Node/Deno relay inside the customer's VLAN that re-signs and forwards. | Works when the NVR has no internet. One per site. |

For Stigg's existing Hik-Connect cloud customers: stick with NVR-direct posting — Hik-Connect-hosted NVRs already make outbound HTTPS.

## Configure the NVR

1. **Web UI → Configuration → Network → Advanced Settings → HTTP Listening**
2. Server URL:  
   `https://<project>.supabase.co/functions/v1/hikvision-events?nvr=<NVR_ID>`
3. Method: `POST`, Body: `JSON`.
4. Header: `Content-Type: application/json`.
5. Header: `X-Hik-Signature: HMAC-SHA256(body, <webhook_secret>)`.  
   The NVR's "Server Authentication" → "HMAC-SHA256". Paste the webhook secret you set on `nvr_systems.webhook_secret`.
6. Enable: every Smart Event channel + IO alarm channel that you want StiggOS to see.
7. Save.

## Configure StiggOS

1. **Console → Cameras & Automation → NVR / VMS bridges → Add NVR / VMS**
   - Vendor: `hikvision` (or `hikcentral`).
   - Hostname/port/username/password — only needed if you want Stigg to fire relays back at the NVR.
   - Webhook HMAC secret — paste the same secret you put on the NVR.
2. **Cameras**: link each `cameras` row to the bridge, set `channel_no` to the ISAPI channel ID (1-based).
3. **Arming schedules** — create `business hours` and `after-hours` profiles. Calgary timezone is `America/Edmonton`.
4. **Linkage rules**:
   - Org-wide rule: `event_types=[motion,linecrossing]`, action=`notify_push`, no schedule.
   - Site rule (business hours): `event_types=[linecrossing]`, schedule=`business hours`, actions=`[notify_push, dispatch_route(round_robin guards)]`.
   - Site rule (after-hours): `event_types=[linecrossing,intrusion]`, schedule=`after-hours`, actions=`[fire_relay, fire_siren, dispatch_route(severity_escalation: desk → police)]`.

## Verify

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/hikvision-events?nvr=<NVR_ID>" \
  -H "Content-Type: application/json" \
  -H "X-Hik-Signature: $(echo -n '{"EventNotificationAlert":{"eventType":"linedetection","dateTime":"2026-05-01T18:00:00Z","channelID":1}}' | openssl dgst -sha256 -hmac '<webhook_secret>' -hex | awk '{print $2}')" \
  -d '{"EventNotificationAlert":{"eventType":"linedetection","dateTime":"2026-05-01T18:00:00Z","channelID":1}}'
```

Should return `{"accepted": true, "type": "linecrossing", "camera_id": "…"}`.

Then check **Console → Dispatch** — your event should be there.

## Common gotchas

- **HikCentral Professional**: posts events on a different envelope. We support its shape too — set vendor=`hikcentral` so future schema differences route correctly.
- **Channels**: ISAPI channels are 1-based. Hik-Connect IDs are different — use ISAPI numbers in `cameras.channel_no`.
- **Time skew**: NVR clock drift > 5 min messes with arming schedule evaluation. Enable NTP on the NVR.
- **Heartbeat**: every event refreshes `nvr_systems.last_heartbeat_at`. Stale > 30 min = NVR offline; the daily compliance scan flags this.

## Talk-down / relay

The relay client lives in the edge function (`_shared/hik-relay.ts`). When a linkage rule fires `fire_relay`, the dispatch-router calls the NVR's ISAPI:
```
PUT /ISAPI/System/IO/outputs/{port}/trigger
<IOPortData><outputState>high</outputState></IOPortData>
```
We hold high for the configured duration, then drop low. Same path drives gate openers, strobe lights, and "talk-down" speakers wired to relay outputs.

For HikCentral two-way audio (RTP), set up the audio gateway separately and wire its talk-down endpoint into a `webhook` action on the linkage rule.
