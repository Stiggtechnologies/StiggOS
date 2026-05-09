// Risk advisor — calls portal-advisor edge fn → AI reads the customer's
// 90-day signal pack → recommends up to 3 actions tied to specific data
// points. Each recommendation can be one-clicked into a quote_request.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, AlertCircle, ArrowRight, Cpu, ShieldCheck, Truck, Eye, Lightbulb } from 'lucide-react';
import { invokeFn } from '../lib/supabase';

interface AdvisorResp {
  signals: Record<string, unknown>;
  recommendations: Array<{ title: string; rationale: string; tied_to: string; service_line: string }>;
  generated_at: string;
  model_used: string;
  provider_used: string;
}

const LINE_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  surveillance:  { label: 'Surveillance & Alarm Monitoring',     icon: Eye,         color: 'text-blue-600 bg-blue-50' },
  virtual_guard: { label: 'Virtual Security Guard (active deterrence)', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
  transport:     { label: 'Secure Transport',                    icon: Truck,       color: 'text-amber-700 bg-amber-50' },
  it_cyber:      { label: 'IT & Cybersecurity (vCISO / MSSP)',   icon: Cpu,         color: 'text-emerald-700 bg-emerald-50' },
  assessment:    { label: 'Site hardening assessment',           icon: Lightbulb,   color: 'text-orange-600 bg-orange-50' },
};

export function Advisor() {
  const nav = useNavigate();
  const [data, setData] = useState<AdvisorResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await invokeFn<AdvisorResp>('portal-advisor', {});
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Sparkles size={20} className="text-stigg-600" /> Risk advisor</h1>
        <p className="page-subtitle">Where the program is reducing maintenance exposure, and where additional layers would protect rent, occupancy, and asset condition further. Up to 3 recommendations, each tied to a number from your data.</p>
      </div>

      <div className="card">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white shrink-0"><Sparkles size={20} /></div>
          <div className="flex-1">
            <h2 className="font-semibold text-ink-900">Get a fresh read-out</h2>
            <p className="text-sm text-ink-600 mt-1">
              We read your last 90 days of incidents, patrol completion, and active coverage layers, then surface up to 3 specific moves to reduce security-related maintenance exposure or strengthen asset protection. Each one is tied to a number from your own data, not generic advice. Generation takes ~10 seconds.
            </p>
            <button className="btn-primary mt-3" onClick={run} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing your data…</> : <><Sparkles size={14} /> Run advisor</>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      {data && (
        <>
          <div className="card">
            <h3 className="section-label mb-3">90-day signals the analysis is based on</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(data.signals).map(([k, v]) => (
                <div key={k} className="bg-ink-50 rounded-lg p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{k.replace(/_/g, ' ')}</div>
                  <div className="font-semibold text-ink-900 mt-0.5 text-xs break-words">{format(v)}</div>
                </div>
              ))}
            </div>
          </div>

          {data.recommendations.length === 0
            ? <div className="card text-sm text-ink-500">No recommendations — your operations look clean over the last 90 days.</div>
            : <div className="space-y-3">
                <h3 className="section-label">Recommendations</h3>
                {data.recommendations.map((r, i) => {
                  const meta = LINE_LABEL[r.service_line] ?? { label: r.service_line, icon: Sparkles, color: 'text-ink-500 bg-ink-100' };
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="card hover:border-stigg-300 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${meta.color}`}><Icon size={18} /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-ink-900">{r.title}</h4>
                          <p className="text-sm text-ink-600 mt-1">{r.rationale}</p>
                          <div className="text-[11px] text-ink-500 mt-2">
                            <span className="font-medium">Tied to:</span> <code className="bg-ink-100 px-1.5 py-0.5 rounded">{r.tied_to}</code>
                            <span className="ml-2">· <em>{meta.label}</em></span>
                          </div>
                        </div>
                        <button
                          className="btn-sm-primary shrink-0"
                          onClick={() => nav(`/requests?new=1`)}
                          title="Open a quote request for this"
                        >
                          Get a quote <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
          }

          <div className="text-xs text-ink-400">
            Generated {new Date(data.generated_at).toLocaleString()} · {data.provider_used} / {data.model_used}
          </div>
        </>
      )}
    </div>
  );
}

function format(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.length === 0 ? 'none' : v.length > 3 ? `${v.length} items` : v.map(String).join(', ');
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60);
  return String(v);
}
