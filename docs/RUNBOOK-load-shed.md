# Runbook — load shedding under burst

When you cross 100+ concurrent guards or a major event (sportsball / festival / fire) drives camera-alert spam, the system has four levers.

## 1. Rate-limit AI agents (cheapest)

Set in Supabase secrets:
```
COMPLIANCE_SCAN_MAX_FINDINGS=50
INCIDENT_COPILOT_MAX_PER_MINUTE_PER_USER=4
```

These are read by the edge functions and cap usage in code. Default is 100 / 6 respectively.

## 2. Switch to a faster (cheaper) model

For the duration of the burst, override the agent role:
```
ANTHROPIC_MODEL_AGENT=claude-haiku-4-5-20251001
```
Or switch provider entirely: `LLM_PROVIDER=openai_compatible` with a Groq endpoint.

## 3. Defer non-urgent agents

Pause the daily compliance scan until burst ends:
```sql
SELECT cron.unschedule('stigg-compliance-daily');
-- when ready:
\i supabase/migrations/0005_storage_and_cron.sql
```

## 4. Auto-triage at the edge

`camera_alerts` with confidence < 0.6 can be auto-marked `dismissed` server-side. There's a TODO in `monitoring/src/App.tsx` to add a setting; for now run:

```sql
UPDATE camera_alerts
   SET triage_status = 'dismissed', triaged_at = now()
 WHERE confidence < 0.6 AND triage_status = 'pending';
```

This is safe — alerts are forensic-searchable even after dismissal.

## What to NOT do

- Don't disable RLS to "speed things up". RLS overhead at scale is < 5%. Disabling it leaks data.
- Don't drop the audit trigger. The audit log is a regulatory artifact.
- Don't share the service-role key with the field PWA. Ever.
