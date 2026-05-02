# Operator playbook

Day-to-day operating cadence for the Stigg ops team running on StiggOS.

## Daily (start of shift, ~5 min)

- [ ] Console → Command Center → confirm active guards count matches the schedule.
- [ ] Console → Compliance → check for new `critical`/`high` insights.
- [ ] Monitoring → confirm camera grid shows all online (offline cameras = amber).
- [ ] Open incidents from overnight — confirm each has been triaged.

## Daily (end of shift, ~5 min)

- [ ] Console → Patrols → confirm all expected tour runs `completed`.
- [ ] Spot-check 2 random guard clock-outs vs. site geofence.
- [ ] Review the Activity feed for anything weird.

## Weekly

- [ ] **Monday morning**: run Schedule Agent for the next week. Review rejected proposals.
- [ ] **Monday morning**: review SSIA license expiries 0–30 days out.
- [ ] **Wednesday**: review Sales Pipeline. Move stale leads to `dormant`.
- [ ] **Friday**: settle the prior week's shifts (`completed` status with `hours_worked` populated).

## Monthly

- [ ] **First business day**: run `Invoices → Run billing for this month` for the prior month.
- [ ] **First week**: review unpaid invoices with status `overdue`.
- [ ] **Mid-month**: PIPEDA tabletop drill (log to `privacy_breach_register` with `[DRILL]` prefix).
- [ ] **End of month**: export the audit log for the month → archive to compliance storage.

## Quarterly

- [ ] Review every active client's `health_score`. Action any below 60.
- [ ] Review contract renewals due in 90 days.
- [ ] Disaster-recovery drill: restore the latest `pg_dump` to a staging DB and verify the console boots against it.

## Annually

- [ ] WCB filings.
- [ ] Cyber insurance renewal (questionnaire).
- [ ] Penetration test on the four web surfaces.
- [ ] SSIA business license renewal.

## When you hire a new guard

1. Console → Guards → Add guard.
2. Console → Settings → invite their email; assign role `guard`.
3. Set their SSIA license number + expiry. Save.
4. Run a compliance scan to confirm no warnings.

## When you onboard a new client

1. Console → Clients → Add client.
2. Console → Sites → Add site(s); link to the client.
3. Console → Contracts → Create contract; service lines + monthly value.
4. (Optional) Toggle `portal_enabled` on the client and add a `role='client'` user bound to them.
5. Run a Sales Assessment if they want a documented service rationale.

## When something breaks

- Console errors on every page → Supabase outage or env vars missing. Check Sentry.
- One page's data is empty when it should not be → check RLS. The user might have lost their `org_id`.
- Edge function returns 500 → Supabase logs (`supabase functions logs <name>`).
- AI returns nonsense → confirm `LLM_PROVIDER` env. Switch to mock to isolate.

## Numbers worth watching

| Metric                              | Healthy range          | Where to find       |
|-------------------------------------|------------------------|---------------------|
| Active guards / scheduled shifts    | 1.0–1.1                | Command Center      |
| Open critical incidents             | 0                      | Command Center      |
| SSIA expiries in 30 days            | < 5% of active guards  | Compliance          |
| Unpaid invoices > 60 days           | < 2% of MRR            | Invoices            |
| AI session cost (CAD/day)           | < $5/active user       | `ai_sessions`       |
| Camera offline > 5 min              | 0                      | Monitoring          |
