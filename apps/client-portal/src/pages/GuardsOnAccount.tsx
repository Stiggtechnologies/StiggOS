// Guards on my account — radical transparency. The customer sees who serves
// their sites, with badges, license expiry, hours. Builds enormous trust.

import { useEffect, useState } from 'react';
import { Users, BadgeCheck, AlertCircle, Clock, Calendar, Star, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ago, daysUntil } from '../lib/format';
import { RateGuardModal } from '../components/RateGuardModal';

interface Guard {
  guard_id: string;
  first_name: string; last_name: string;
  ssia_license_number: string | null;
  ssia_license_expiry: string | null;
  first_aid_expiry: string | null;
  hire_date: string | null;
  shifts_last_90d: number;
  hours_last_90d: number;
  last_seen_at: string | null;
}

export function GuardsOnAccount() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Guard | null>(null);
  const [ctx, setCtx] = useState<{ orgId: string; clientId: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('client_guards_on_account');
      setGuards((data ?? []) as Guard[]);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: prof } = await supabase.from('user_profiles').select('org_id, client_id').eq('auth_user_id', u.user.id).single();
        if (prof?.org_id && prof?.client_id) setCtx({ orgId: prof.org_id, clientId: prof.client_id });
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Users size={20} className="text-stigg-600" /> Guards on your account</h1>
        <p className="page-subtitle">Every guard who has worked one of your sites in the last 90 days, with credentials shown.</p>
      </div>

      {loading
        ? <div className="text-sm text-ink-500">Loading…</div>
        : guards.length === 0
          ? <div className="card text-center py-10">
              <Users size={28} className="mx-auto text-stigg-600 mb-2" />
              <h3 className="font-semibold text-ink-900">Roster will appear after the first shift</h3>
              <p className="text-sm text-ink-600 mt-1 max-w-md mx-auto">Every guard who works on one of your properties — with full credentials, license expiry tracking, and 90-day shift history — will be listed here.</p>
            </div>
          : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {guards.map((g) => <Card key={g.guard_id} g={g} onRate={() => setRating(g)} />)}
            </div>
      }

      {rating && ctx && (
        <RateGuardModal
          guardId={rating.guard_id}
          guardName={`${rating.first_name} ${rating.last_name}`}
          clientId={ctx.clientId}
          orgId={ctx.orgId}
          onClose={() => setRating(null)}
          onSubmitted={() => { setRating(null); }}
        />
      )}
    </div>
  );
}

function Card({ g, onRate }: { g: Guard; onRate: () => void }) {
  const ssiaDays = daysUntil(g.ssia_license_expiry);
  const faDays   = daysUntil(g.first_aid_expiry);
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-ink-700 to-ink-900 grid place-items-center text-white font-semibold text-base shrink-0">
          {g.first_name?.[0]}{g.last_name?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink-900">{g.first_name} {g.last_name}</div>
          {g.hire_date && <div className="text-xs text-ink-500">with Stigg since {new Date(g.hire_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })}</div>}
        </div>
        <button onClick={onRate} className="text-xs text-stigg-600 hover:underline inline-flex items-center gap-1 shrink-0" title="Rate this guard">
          <Star size={12} /> Rate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-ink-50 rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">90-day shifts</div>
          <div className="font-semibold text-ink-900 tabular-nums">{g.shifts_last_90d}</div>
        </div>
        <div className="bg-ink-50 rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">90-day hours</div>
          <div className="font-semibold text-ink-900 tabular-nums">{Number(g.hours_last_90d).toFixed(0)}</div>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <Cred label="SSIA license" number={g.ssia_license_number} expiry={g.ssia_license_expiry} days={ssiaDays} />
        <Cred label="First-aid"    number={null}                  expiry={g.first_aid_expiry}    days={faDays} />
      </div>

      {g.last_seen_at && (
        <div className="text-[11px] text-ink-500 flex items-center gap-1.5 pt-1 border-t border-ink-100">
          <Clock size={10} /> Last on a shift {ago(g.last_seen_at)}
        </div>
      )}
    </div>
  );
}

function Cred({ label, number, expiry, days }: { label: string; number: string | null; expiry: string | null; days: number | null }) {
  if (!expiry) {
    return (
      <div className="flex items-center gap-2 text-ink-500">
        <AlertCircle size={12} className="text-ink-400" />
        <span className="font-medium text-ink-700">{label}:</span>
        <span>not on file</span>
      </div>
    );
  }
  const tone = days != null && days < 0 ? 'text-red-600' : days != null && days <= 30 ? 'text-amber-700' : 'text-emerald-700';
  return (
    <div className="flex items-center gap-2">
      <BadgeCheck size={12} className={tone} />
      <span className="font-medium text-ink-700">{label}:</span>
      {number && <span className="font-mono text-ink-700">{number}</span>}
      <span className="ml-auto text-ink-500 inline-flex items-center gap-1"><Calendar size={10} />{expiry}</span>
    </div>
  );
}
