-- Storage buckets + pg_cron for daily compliance scans.
--
-- This migration is idempotent — `IF NOT EXISTS` everywhere.
-- pg_cron + pg_net are Supabase-managed extensions; on a vanilla Postgres
-- install they may not be present. The DO block guards each step.

-- ─── Storage buckets ────────────────────────────────────────────────────────
-- We need:
--   • 'evidence'  — incident photos / videos / audio. Private; signed URLs only.
--   • 'invoices'  — generated invoice HTMLs/PDFs. Public-read for portal links.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
      VALUES ('evidence', 'evidence', false)
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public)
      VALUES ('invoices', 'invoices', true)
      ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ─── Daily compliance scan via pg_cron + pg_net ─────────────────────────────
-- Calls the compliance-watcher edge function every morning at 06:00 America/Edmonton
-- (12:00 UTC standard time / 13:00 UTC during DST — pg_cron runs UTC, set to 12:30
-- as a sane mid-morning slot in both seasons).
--
-- Required Supabase secrets / GUCs (set with: alter database postgres set …):
--   app.supabase_url            — your project URL
--   app.compliance_scan_token   — a service-role JWT (or per-org JWT)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('stigg-compliance-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stigg-compliance-daily');

    PERFORM cron.schedule(
      'stigg-compliance-daily',
      '30 12 * * *',
      $$
        SELECT net.http_post(
          url := current_setting('app.supabase_url', true) || '/functions/v1/compliance-watcher',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.compliance_scan_token', true)
          ),
          body := '{}'::jsonb
        );
      $$
    );
  END IF;
END $$;
