# Runbook — Asset tracking (AirTag / Tile / FindMy bridge)

For keys, radios, patrol kits, lockboxes — small things that go missing.

## What StiggOS provides

- `asset_trackers` row per device (label, type, vendor, serial, assigned guard).
- `asset_track_pings` — every location report.
- Daily compliance scan flags trackers silent > 24h (`OPS-ASSET-STALE`), > 72h (`OPS-ASSET-LOST`), or with battery < 15% (`OPS-ASSET-BATT`).
- Console UI at `/assets` — colour-coded by recency.

## What StiggOS doesn't provide

The **bridge** itself — the thing that pulls AirTag locations from Apple's network and posts them to our webhook. AirTags don't have a public API; you need a relay.

## Bridge options

| Option | Setup | Trade-off |
|---|---|---|
| **OpenHaystack** | Mac mini in HQ runs OpenHaystack daemon, pulls reports for your AirTags' public keys, forwards to StiggOS. | Works for AirTags. Requires Apple ID + macOS. |
| **macless-haystack** | Linux container with anisette-server + haystack daemon. | No Mac needed. Apple ID still required. |
| **Tile (real API)** | Tile devices have a documented business API. | Vendor lock-in, monthly cost. |
| **Samsung SmartThings** | Galaxy SmartTags via SmartThings webhook. | Android-flavoured fleet only. |
| **Generic BLE** | iBeacon-style tags + a phone in HQ doing the relay. | Range limited to a few hundred meters. |

For Stigg's situation (mostly small assets that move within Calgary / Fort McMurray), OpenHaystack on a Mac mini at HQ is the cheapest professional setup.

## Set the Supabase secret

```bash
supabase secrets set ASSET_TRACK_TOKEN=$(openssl rand -hex 32)
```

## Bridge → StiggOS contract

The bridge POSTs every fix to:

```
POST https://<project>.supabase.co/functions/v1/asset-track?token=<ASSET_TRACK_TOKEN>
Content-Type: application/json

{
  "device_serial": "AT-keys-01",
  "lat": 51.05,
  "lng": -114.07,
  "timestamp": 1746138000,
  "accuracy_m": 6,
  "battery_pct": 78,
  "source": "openhaystack"
}
```

`device_serial` must match `asset_trackers.device_serial` exactly.

## Operational pattern

1. Buy a 4-pack of AirTags ($120). Label them "Master Keys", "FM Patrol Kit", "Calgary Patrol Kit", "Lockbox 7".
2. Add each to **Console → Asset trackers** with the AirTag serial (back of the device).
3. Pair them on a company iPhone, then export the public keys to OpenHaystack.
4. Spin up the bridge — the `last_seen_at` field updates as fixes flow in.

## Common gotchas

- AirTag refresh rate: ~15 minutes when in motion, slower when still. Don't expect real-time.
- OpenHaystack rate-limits: don't spam Apple's network — ~1 fetch per 30 minutes per tag is healthy.
- **Privacy**: AirTags emit "you are being tracked" notifications to nearby iPhones not in your Apple ID. For Stigg-only assets in Stigg-only hands, this is fine — but never put one on a person, vehicle, or container that doesn't belong to Stigg without consent.
