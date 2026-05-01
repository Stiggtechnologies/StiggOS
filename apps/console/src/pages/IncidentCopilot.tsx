// Incident Copilot UI. Voice or text in → structured incident out via the
// `incident-copilot` edge function. Falls back gracefully when Supabase
// isn't configured: shows the same UI but disables the submit.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Brain, Mic, MicOff, Send, Loader2, ShieldCheck } from 'lucide-react';
import { invokeFn, supabase, supabaseConfigured } from '../lib/supabase';
import type { Site } from '@stigg/shared';

export function IncidentCopilot() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState('');
  const [narration, setNarration] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ incident_id: string | null; iterations: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice capture (browser SpeechRecognition).
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.from('sites').select('id, name, city').eq('is_active', true).then(({ data }) => {
      setSites((data ?? []) as Site[]);
      if (data && data[0]) setSiteId(data[0].id);
    });
  }, []);

  function toggleListen() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Voice capture is unsupported in this browser. Use Chrome or Edge for now.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-CA';
    let final = narration;
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' '; else interim += t;
      }
      setNarration((final + interim).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!siteId || narration.trim().length < 10) {
      setError('Provide a site and at least a sentence of narration.');
      return;
    }
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await invokeFn<{ incident_id: string | null; iterations: number }>(
        'incident-copilot',
        { site_id: siteId, narration: narration.trim() },
      );
      setResult(r);
      if (r.incident_id) setNarration('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="text-blue-400" /> Incident Copilot
        </h1>
        <p className="text-slate-400 mt-1">
          Speak or type the raw narration. The model structures who/what/when/where, picks category & severity,
          and saves the incident with full chain-of-custody on any attached evidence.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <label className="block text-sm">
          <span className="text-slate-400">Site</span>
          <select className="input mt-1" value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
            {sites.length === 0 && <option value="">No sites visible — check Supabase connection</option>}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>
            ))}
          </select>
        </label>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-400">Narration</span>
            <button
              type="button"
              onClick={toggleListen}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded border ${
                listening ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {listening ? <><MicOff size={12} /> Stop</> : <><Mic size={12} /> Speak</>}
            </button>
          </div>
          <textarea
            className="input min-h-[160px] font-mono text-sm"
            placeholder="so I was at northview 5 around 2 AM and the motion alarm went off on the east loading door…"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            <ShieldCheck className="inline" size={12} /> PIPEDA — narration stored verbatim and the structured fields are
            both retained. Evidence attachments add chain-of-custody entries automatically.
          </p>
        </div>

        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 text-red-200 text-sm p-3">{error}</div>
        )}
        {result && result.incident_id && (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm p-3">
            Created incident <code>{result.incident_id.slice(0,8)}…</code> in {result.iterations} model iteration{result.iterations === 1 ? '' : 's'}.
          </div>
        )}

        <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={busy || !supabaseConfigured}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Structuring…</> : <><Send size={16} /> Submit to Copilot</>}
        </button>
      </form>
    </div>
  );
}
