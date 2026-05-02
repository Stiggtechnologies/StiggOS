# Runbook — Deployment

End-to-end deploy to a fresh Supabase project + Vercel for the four web apps.
Time budget: ~60 minutes the first time, ~10 minutes for redeploys.

## 1. Provision Supabase

1. Create a project on Supabase (region: **ca-central-1** for Alberta data residency).
2. Copy `Project URL`, `anon` key, and `service_role` key.
3. Set the project secrets:
   ```bash
   supabase link --project-ref <ref>
   supabase secrets set \
     ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY=... / GOOGLE_API_KEY=... / OPENAI_BASE_URL=...
     STRIPE_WEBHOOK_SECRET=whsec_...
     ALLOWED_ORIGINS=https://console.stigg.ca,https://portal.stigg.ca,https://field.stigg.ca,https://monitor.stigg.ca
   ```

## 2. Apply migrations

```bash
supabase db push                 # 0001_foundation, 0002_rls, 0003_audit, 0004_seed_dev, 0005_storage_and_cron
```

If you do **not** want the dev seed (real customer deploy), delete `supabase/migrations/0004_seed_dev.sql` first.

After applying:

```bash
psql "$SUPABASE_DB_URL" -c "ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';"
psql "$SUPABASE_DB_URL" -c "ALTER DATABASE postgres SET app.compliance_scan_token = '<service_role_jwt>';"
```

This enables the daily `compliance-watcher` cron in `0005_storage_and_cron.sql`.

## 3. Deploy edge functions

```bash
supabase functions deploy incident-copilot
supabase functions deploy schedule-agent
supabase functions deploy compliance-watcher
supabase functions deploy forensic-search
supabase functions deploy sales-assessment
supabase functions deploy billing-run
supabase functions deploy invoice-pdf
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 4. Seed the first org + admin

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
npm run seed:org -- \
  --slug=stigg --name="Stigg Security" \
  --admin-email=admin@stigg.ca --admin-password='<temporary-strong-password>'
```

The admin must change the password on first login.

## 5. Deploy the four apps

Each app has a `vercel.json`. From the repo root:

```bash
vercel --cwd apps/console        --prod
vercel --cwd apps/client-portal  --prod
vercel --cwd apps/guard-mobile   --prod
vercel --cwd apps/monitoring     --prod
```

Set env vars on each Vercel project:

```
VITE_SUPABASE_URL       = https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY  = <anon_key>
```

Bind custom domains:

| Surface       | Suggested host          |
|---------------|-------------------------|
| Console       | console.stigg.ca        |
| Client Portal | portal.stigg.ca         |
| Guard Mobile  | field.stigg.ca          |
| Monitoring    | monitor.stigg.ca        |

## 6. Stripe

1. Create products + prices in Stripe.
2. Add a webhook endpoint pointing at `https://<ref>.supabase.co/functions/v1/stripe-webhook`.
3. Subscribe to: `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
4. Copy the signing secret to Supabase secrets as `STRIPE_WEBHOOK_SECRET`.

## 7. Smoke tests

After deploy, run:

```bash
curl -s https://<ref>.supabase.co/functions/v1/compliance-watcher \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -X POST -d '{}' | jq
```

Should return `{"findings": N, "inserted": N}`. Open the console at `https://console.stigg.ca/ai` — insights with citations should appear.

## 8. Rollback

```bash
git revert <bad commit>
git push origin main
# Vercel auto-redeploys; supabase functions deploy on the previous commit if needed.
```

For schema rollback, write a `down` migration — never `DROP TABLE` on a live tenant.
