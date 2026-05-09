// Approved customer-facing copy. Appears once at the top of the dashboard.
// Source of truth: docs/MARKETING-COPY.md.
//
// Positioning: Stigg is an asset-protection program delivered as a
// repeatable operating system — not a guard service billed by the hour.
// Four proof points the portal exists to demonstrate.

import { Shield, BarChart3, Cpu, TrendingUp } from 'lucide-react';

const PROOF_POINTS = [
  { icon: BarChart3, title: 'Standardized reporting across your portfolio',
    body: 'Every site, every shift, the same KPIs — rolled up monthly into one statement your operations team and auditors can act on.' },
  { icon: TrendingUp, title: 'Reduces security-related maintenance exposure',
    body: 'GPS-verified patrols, photo-evidenced incidents, and faster intervention reduce vandalism, forced entry, and damage to common areas.' },
  { icon: Cpu, title: 'Tech-enabled mobile model that holds quality at scale',
    body: 'AI-assisted dispatch, real-time supervisor review, and an integrated camera + asset-tracker layer keep service consistent as you grow.' },
  { icon: Shield, title: 'A repeatable operating system — not just more guards',
    body: 'The same platform protects one site or your entire national portfolio. Onboard a new building in days, not quarters.' },
];

export function WelcomeBanner() {
  return (
    <aside className="card border-stigg-500/30">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white shrink-0"><Shield size={18} /></div>
        <div>
          <h2 className="font-semibold text-ink-900">Your asset-protection program</h2>
          <p className="text-sm text-ink-600 mt-0.5">
            Security as protection of rent, occupancy, resident confidence, and asset condition — not a line-item operating expense.
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {PROOF_POINTS.map((p) => (
          <div key={p.title} className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <p.icon className="text-stigg-600 mt-0.5 shrink-0" size={14} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink-900">{p.title}</div>
              <p className="text-[11px] text-ink-600 mt-0.5 leading-snug">{p.body}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
