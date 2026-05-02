# Runbook — Tuning dispatch & linkage rules

The decision the standalone Hikvision NVR can't make:
*"Send the first event to a rotating guard, the second to the monitoring desk, escalate to police if no ack within 90 seconds."*

StiggOS makes that decision in `packages/dispatch`. This runbook is the practical guide to writing those rules.

## The model

```
trigger event ──► [linkage rule selected] ──► [arming schedule gate] ──► [actions in order]
                       (per scope, severity, type)         (when?)            (what to do)
                                                                               │
                                          dispatch_route ◄── action of kind 'dispatch_route'
                                                  │
                                   strategy: round_robin | escalation | severity_escalation | broadcast
                                                  │
                                          ▼ rotating list of targets
```

## Three rules every customer should have

### 1 · Always-on org safety net (priority 100)

```json
{
  "scope_type": "org",
  "event_types": ["intrusion", "object_removal", "tamper"],
  "actions": [
    { "kind": "notify_push" },
    { "kind": "create_incident" }
  ],
  "priority": 100
}
```

Always armed, no schedule. Catches anything that fell through site/camera-specific rules.

### 2 · Business-hours: notify only (priority 50)

```json
{
  "scope_type": "site",
  "scope_id": "<site uuid>",
  "event_types": ["linecrossing", "motion", "pir"],
  "arming_schedule_id": "<biz hours schedule>",
  "actions": [
    { "kind": "notify_push" }
  ],
  "priority": 50
}
```

Quiet during the day so reception isn't paged for every customer walk-in.

### 3 · After-hours: full dispatch + relay (priority 50)

```json
{
  "scope_type": "site",
  "scope_id": "<site uuid>",
  "event_types": ["linecrossing", "intrusion"],
  "arming_schedule_id": "<after-hours schedule>",
  "actions": [
    { "kind": "fire_relay", "params": { "port": 1, "duration_ms": 10000 } },
    { "kind": "fire_siren" },
    { "kind": "dispatch_route", "route_id": "<after-hours route>" },
    { "kind": "create_incident" }
  ],
  "priority": 50
}
```

Loud + dispatched after dark.

## Three dispatch routes worth keeping

### Round-robin guards (medium severity)

```json
{
  "name": "Calgary mobile patrols",
  "strategy": "round_robin",
  "targets": [
    { "kind": "guard", "channel": "sms",  "address": "+15875550101", "cooldown_sec": 300 },
    { "kind": "guard", "channel": "sms",  "address": "+15875550102", "cooldown_sec": 300 },
    { "kind": "guard", "channel": "sms",  "address": "+15875550103", "cooldown_sec": 300 }
  ]
}
```

Each guard is paged at most once per 5 minutes. Cursor advances per fire.

### Severity escalation

```json
{
  "name": "Severity escalation",
  "strategy": "severity_escalation",
  "targets": [
    { "kind": "desk",   "channel": "webhook", "address": "https://desk.stigg.ca/in", "fires_at_or_above": "low" },
    { "kind": "guard",  "channel": "voice",   "address": "+15875550199",             "fires_at_or_above": "high" },
    { "kind": "police", "channel": "voice",   "address": "+19115550001",             "fires_at_or_above": "critical" }
  ]
}
```

The desk handles everything; humans are only paged on `high`+; police only on `critical`.

### Broadcast (true emergency)

```json
{
  "name": "All hands",
  "strategy": "broadcast",
  "targets": [
    { "kind": "guard",  "channel": "sms",  "address": "+1...", "fires_at_or_above": "high" },
    { "kind": "desk",   "channel": "voice","address": "+1...", "fires_at_or_above": "high" },
    { "kind": "police", "channel": "voice","address": "+1...", "fires_at_or_above": "critical" }
  ]
}
```

Every eligible target fires at once. Use for life-safety only — it's loud.

## How specificity works

`evaluate()` picks one rule by:
1. Most-specific scope first: `camera` > `site` > `org`.
2. Within scope, lowest `priority` number wins.

Make `priority` a "concern band" not a sequence — e.g. 10 for life-safety overrides, 50 for normal, 100 for safety-net.

## Common patterns

| Goal | Recipe |
|---|---|
| Silent alarm during the day, loud at night | Two rules, two arming schedules, same site. |
| Repeat-event suppression | `cooldown_sec` per target on the dispatch_route. |
| Different action set per camera | Camera-scoped rule with `priority` < site-scoped. |
| Site-wide override (e.g. lockdown drill) | New schedule with all-day windows + a high-priority rule. Toggle `is_active` to enable/disable. |
| Mute false-positive cameras at night | Camera-scoped rule with `event_types=[motion]`, action=`[]`, priority 1. |

## Tracing decisions

Every fire writes to `dispatch_events` with `payload`, `target`, `status`, and the source `rule_id`. `Console → Dispatch` shows the live stream. The trace breadcrumb is in `dispatch_events.payload.trace` when set.

## Don'ts

- Don't put a `dispatch_route` action without a schedule on `motion` events at the org level — you'll page guards for every cat at every site.
- Don't use `cooldown_sec=0` plus `round_robin` — the same guard gets re-paged on bursts.
- Don't fire a `fire_relay` at a camera without verifying its `nvr_system_id` is set (the action will error).
