// Settings — notification preferences. Teammate invites land in v2 (needs an
// admin-side approval flow on the ops side first).

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Bell, Save, Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Prefs {
  user_id: string;
  org_id: string;
  weekly_dar_digest: boolean;
  monthly_statement_email: boolean;
  critical_incident_alerts: boolean;
  service_request_updates: boolean;
  marketing_updates: boolean;
  digest_day: 'monday'|'tuesday'|'wednesday'|'thursday'|'friday';
}

export function Settings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      setEmail(u.user?.email ?? null);
      if (!userId) { setError('not signed in'); setLoading(false); return; }

      const { data: profile } = await supabase.from('user_profiles').select('org_id').eq('auth_user_id', userId).single();

      const { data: existing } = await supabase.from('customer_notification_prefs').select('*').eq('user_id', userId).maybeSingle();
      if (existing) {
        setPrefs(existing as Prefs);
      } else {
        // Default: opt-in everywhere except marketing.
        setPrefs({
          user_id: userId, org_id: profile?.org_id ?? '',
          weekly_dar_digest: true, monthly_statement_email: true,
          critical_incident_alerts: true, service_request_updates: true,
          marketing_updates: false, digest_day: 'monday',
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!prefs) return;
    setSaving(true); setSaved(false); setError(null);
    const { error } = await supabase.from('customer_notification_prefs').upsert(prefs, { onConflict: 'user_id' });
    setSaving(false);
    if (error) setError(error.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 2200); }
  }

  if (loading) return <div className="text-sm text-ink-500">Loading…</div>;
  if (!prefs) return <div className="card text-sm text-red-700">Could not load your preferences.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><SettingsIcon size={20} className="text-stigg-600" /> Settings</h1>
        <p className="page-subtitle">Email preferences for the {email} mailbox.</p>
      </div>

      <div className="card space-y-4 max-w-xl">
        <h2 className="font-semibold flex items-center gap-2"><Bell size={16} className="text-stigg-600" /> Email notifications</h2>

        <Toggle label="Weekly activity digest" description="A short summary every Monday morning of last week's shifts, scans, and incidents."
                checked={prefs.weekly_dar_digest} onChange={(v) => setPrefs({ ...prefs, weekly_dar_digest: v })} />

        <Toggle label="Monthly statement" description="When a new monthly statement is generated, get a copy by email."
                checked={prefs.monthly_statement_email} onChange={(v) => setPrefs({ ...prefs, monthly_statement_email: v })} />

        <Toggle label="Critical incident alerts" description="Immediate alert when a critical or high-severity incident is logged on any of your sites."
                checked={prefs.critical_incident_alerts} onChange={(v) => setPrefs({ ...prefs, critical_incident_alerts: v })} />

        <Toggle label="Service request updates" description="Status changes on tickets you've opened with us."
                checked={prefs.service_request_updates} onChange={(v) => setPrefs({ ...prefs, service_request_updates: v })} />

        <Toggle label="Product & service updates" description="Occasional updates about new capabilities. We won't spam you."
                checked={prefs.marketing_updates} onChange={(v) => setPrefs({ ...prefs, marketing_updates: v })} />

        <div className="border-t border-ink-200 pt-4 flex items-center justify-end gap-3">
          {saved && <span className="text-emerald-700 text-sm flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>}
          {error && <span className="text-red-700 text-sm flex items-center gap-1"><AlertCircle size={14} /> {error}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save preferences</>}
          </button>
        </div>
      </div>

      <div className="card max-w-xl">
        <h2 className="font-semibold flex items-center gap-2 mb-2"><Mail size={16} className="text-stigg-600" /> Need teammates added?</h2>
        <p className="text-sm text-ink-600">
          We can give portal access to your colleagues — regional managers, board members, asset managers — at no extra cost. Email <a href="mailto:admin@stigg.ca" className="text-stigg-600 hover:underline">admin@stigg.ca</a> with the names and emails, or open a service request.
        </p>
      </div>

      <div className="card max-w-xl">
        <h2 className="font-semibold mb-2">Onboarding</h2>
        <p className="text-sm text-ink-600 mb-3">Re-run the introductory tour or open the searchable Help Center anytime.</p>
        <button
          className="btn-ghost"
          onClick={async () => {
            const { data: u } = await supabase.auth.getUser();
            if (u.user) await supabase.from('user_profiles').update({ tours_completed: {} }).eq('auth_user_id', u.user.id);
            window.location.href = '/';   // forces App to remount → HelpLauncher auto-launches
          }}
        >
          Replay onboarding tour
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        className={`mt-0.5 h-6 w-10 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-stigg-600' : 'bg-ink-300'}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
      <div className="flex-1">
        <div className="font-medium text-ink-900 text-sm">{label}</div>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
    </label>
  );
}
