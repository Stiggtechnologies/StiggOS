# Runbook — Vehicle GPS via Traccar / OsmAnd

StiggOS accepts GPS fixes from any tracker that speaks the OsmAnd query protocol or the Traccar HTTP forwarder JSON shape.

## Pick your hardware

| Option | Use case | Cost |
|---|---|---|
| OEM tracker (Queclink GV57CG, Concox JM-VL03) | Fleet-grade, hardwired to vehicle ignition | $80–$150/unit + $5/mo SIM |
| OBD-II tracker (Bouncie, Vyncs) | Plug-and-play, light fleet | $80 + $8/mo |
| Phone (OsmAnd app) | Spare phone in glovebox, mobile patrols | $0 |
| Self-hosted Traccar server + any of the 200 supported devices | Existing fleet | $0 server, hardware varies |

## OsmAnd phone setup (cheapest)

1. Install OsmAnd on the phone.
2. Settings → OsmAnd Live → Tracking → Online tracking URL:
   ```
   https://<project>.supabase.co/functions/v1/vehicle-track?token=<TRACCAR_TOKEN>&id={0}&lat={1}&lon={2}&timestamp={2}&speed={5}&bearing={6}
   ```
3. Set the device ID to match `vehicles.unit_number` exactly.
4. Tracking interval: 30s when moving, 5m when idle.

## Traccar server setup (existing fleet)

1. Install Traccar (open-source — `docker run traccar/traccar`).
2. Add your devices in Traccar's UI; map their unique IDs to `vehicles.unit_number` (or `vehicles.metadata.device_id`).
3. Server → Configure forwarders → JSON forwarder:
   ```
   URL:    https://<project>.supabase.co/functions/v1/vehicle-track?token=<TRACCAR_TOKEN>
   Method: POST
   ```

## Set the Supabase secret

```bash
supabase secrets set TRACCAR_TOKEN=$(openssl rand -hex 32)
```

Use the same value in the URL above.

## Speeding / idling / unauthorized-use thresholds

Per-vehicle overrides in `vehicles.metadata`:

```json
{
  "speed_limit_kmh": 110,
  "idle_minutes": 10,
  "authorized_windows": [
    { "days": [1,2,3,4,5], "start": "06:00", "end": "20:00", "timezone": "America/Edmonton" }
  ]
}
```

Defaults: 110 km/h, 10 min idle, no window restriction (always authorized).

## Live map

`Console → Vehicles & GPS` shows current position + alert backlog. The map view (with track playback) is on the next sprint — the data is in `vehicle_track_points` ready to render.

## Verify

```bash
curl "https://<project>.supabase.co/functions/v1/vehicle-track?token=$TOKEN&id=P-12&lat=51.05&lon=-114.07&timestamp=$(date +%s)&speed=95"
```

Should return `{"accepted": true, "alerts": []}`.

Set speed=200 in the URL to fire a `critical` speeding alert — check **Console → Dispatch**.
