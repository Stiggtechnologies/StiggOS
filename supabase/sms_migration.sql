-- SMS Broadcasting System — Twilio Integration
-- Tables: sms_broadcasts (campaign tracking), sms_logs (individual message logs)
-- Used by: Communications.tsx, smsService.ts, send-sms Edge Function

-- SMS Broadcasts (campaign-level tracking)
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL DEFAULT 'aim' CHECK (company IN ('aim', 'stigg', 'syncai')),
  category TEXT NOT NULL DEFAULT 'marketing' CHECK (category IN ('marketing', 'alert', 'reminder', 'notification')),
  message_template TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'completed_with_errors', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS Logs (individual message tracking)
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES sms_broadcasts(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered')),
  twilio_sid TEXT,
  error_message TEXT,
  company TEXT NOT NULL DEFAULT 'aim' CHECK (company IN ('aim', 'stigg', 'syncai')),
  category TEXT NOT NULL DEFAULT 'notification' CHECK (category IN ('marketing', 'alert', 'reminder', 'notification')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sms_logs_broadcast ON sms_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_company ON sms_logs(company);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_company ON sms_broadcasts(company);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_status ON sms_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created ON sms_broadcasts(created_at DESC);

-- RLS Policies
ALTER TABLE sms_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (internal tool)
CREATE POLICY "Authenticated users can manage broadcasts" ON sms_broadcasts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage sms_logs" ON sms_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Service role bypass for Edge Functions
CREATE POLICY "Service role full access broadcasts" ON sms_broadcasts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sms_logs" ON sms_logs
  FOR ALL USING (auth.role() = 'service_role');
