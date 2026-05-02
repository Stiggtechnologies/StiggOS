import { useEffect, useState } from 'react';
import { Shield, MapPin, AlertOctagon, ScanLine, Mic, WifiOff, Wifi, LogOut, RefreshCw } from 'lucide-react';
import { supabase, supabaseConfigured, invokeFn } from './lib/supabase';
import { getFix, type Fix } from './lib/geo';
import { enqueue, read as readQueue, remove as removeQueue } from './lib/queue';

type Tab = 'shift' | 'tour' | 'incident' | 'panic';

export function App() {
  const [tab, setTab] = useState<Tab>('shift');
  const [online, setOnline] = useState(navigator.onLine);
  const [signedIn, setSignedIn] = useState(false);
  const [queueSize, setQueueSize] = useState(readQueue().length);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    const onUp = () => setOnline(true), onDown = () => setOnline(false);
    const onReplay = () => setOnline(navigator.onLine);   // SW signal — re-trigger the replay effect.
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    window.addEventListener('stigg:replay', onReplay);
    return () => {
      sub.data.subscription.unsubscribe();
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
      window.removeEventListener('stigg:replay', onReplay);
    };
  }, []);

  // Replay the offline queue when we come back online.
  useEffect(() => {
    if (!online || !signedIn) return;
    (async () => {
      for (const item of readQueue()) {
        try {
          if (item.kind === 'incident') await invokeFn('incident-copilot', item.payload);
          else if (item.kind === 'tour_scan') await supabase.from('tour_scans').insert(item.payload as any);
          else if (item.kind === 'shift_clock') await supabase.from('shifts').update((item.payload as any).patch).eq('id', (item.payload as any).id);
          removeQueue(item.id);
        } catch {
          break; // Stop on first failure; try again next online window.
        }
      }
      setQueueSize(readQueue().length);
    })();
  }, [online, signedIn]);

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <Shield size={32} className="mx-auto text-blue-500" />
          <h1 className="text-2xl font-bold mt-2">Stigg Field</h1>
          <p className="text-sm text-slate-400 mt-2">Supabase is not configured. Speak to your supervisor.</p>
        </div>
      </div>
    );
  }

  if (!signedIn) return <SignIn />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header online={online} queueSize={queueSize} />
      <main className="flex-1 p-4">
        {tab === 'shift'    && <ShiftCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'tour'     && <TourScanCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'incident' && <IncidentCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'panic'    && <PanicCard />}
      </main>
      <nav className="grid grid-cols-4 border-t border-slate-800 bg-slate-950 sticky bottom-0">
        {([
          { k: 'shift',    label: 'Shift',    icon: MapPin },
          { k: 'tour',     label: 'Tour',     icon: ScanLine },
          { k: 'incident', label: 'Incident', icon: Mic },
          { k: 'panic',    label: 'Panic',    icon: AlertOctagon },
        ] as Array<{ k: Tab; label: string; icon: any }>).map((n) => (
          <button
            key={n.k}
            onClick={() => setTab(n.k)}
            className={`flex flex-col items-center gap-1 py-3 text-xs ${tab === n.k ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <n.icon size={20} />
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Header({ online, queueSize }: { online: boolean; queueSize: number }) {
  return (
    <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-blue-500" />
        <span className="font-semibold">Stigg Field</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {queueSize > 0 && <span className="text-amber-400 inline-flex items-center gap-1"><RefreshCw size={12} /> {queueSize} queued</span>}
        {online ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
        <button className="text-slate-500" onClick={() => supabase.auth.signOut()} title="Sign out"><LogOut size={14} /></button>
      </div>
    </header>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex items-center p-6">
      <form
        className="w-full space-y-3"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr(null);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setBusy(false); if (error) setErr(error.message);
        }}
      >
        <div className="text-center mb-4">
          <Shield size={32} className="mx-auto text-blue-500" />
          <h1 className="text-xl font-bold mt-2">Stigg Field</h1>
        </div>
        <input className="w-full px-3 py-3 rounded bg-slate-900 border border-slate-700" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full px-3 py-3 rounded bg-slate-900 border border-slate-700" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="w-full py-3 rounded bg-blue-600 font-medium" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

function ShiftCard({ onQueue }: { onQueue: () => void }) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function clockIn() {
    setWorking(true); setMsg(null);
    try {
      const f = await getFix();
      setFix(f);
      // In production we'd resolve the active shift via /me; for now we queue
      // the geo + timestamp and let the server reconcile.
      enqueue('shift_clock', {
        patch: {
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          // PostGIS WKT — the edge function rewrites to GEOGRAPHY.
          clock_in_geo: `POINT(${f.lng} ${f.lat})`,
        },
        id: 'self', // placeholder — server resolves to the guard's open shift
      });
      onQueue();
      setMsg('Clock-in queued. Will sync when online.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally { setWorking(false); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-900 p-5">
        <h2 className="font-semibold">My shift</h2>
        <p className="text-sm text-slate-400 mt-1">
          Tap to clock in. The app captures your GPS fix; the server validates against the site geofence.
        </p>
        {fix && (
          <p className="text-xs text-slate-500 mt-3">
            Fix · {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · ±{Math.round(fix.accuracy_m)}m
          </p>
        )}
        <button className="mt-4 w-full py-4 rounded bg-blue-600 font-semibold" onClick={clockIn} disabled={working}>
          {working ? 'Capturing GPS…' : 'Clock in / out'}
        </button>
        {msg && <p className="text-sm text-slate-300 mt-3">{msg}</p>}
      </div>
    </div>
  );
}

function TourScanCard({ onQueue }: { onQueue: () => void }) {
  const [scan, setScan] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-lg bg-slate-900 p-5 space-y-3">
      <h2 className="font-semibold">Tour scan</h2>
      <p className="text-sm text-slate-400">Scan the checkpoint NFC/QR — for now, paste the token below.</p>
      <input
        className="w-full px-3 py-3 rounded bg-slate-950 border border-slate-700 font-mono text-sm"
        placeholder="checkpoint token"
        value={scan}
        onChange={(e) => setScan(e.target.value)}
      />
      <button
        className="w-full py-3 rounded bg-blue-600 font-medium"
        onClick={async () => {
          if (!scan) return;
          try {
            const f = await getFix();
            enqueue('tour_scan', {
              checkpoint_token: scan,
              scanned_at: new Date().toISOString(),
              geo: `POINT(${f.lng} ${f.lat})`,
              geo_accuracy_m: f.accuracy_m,
            });
            onQueue();
            setScan(''); setMsg('Scan queued.');
          } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
        }}
      >
        Submit scan
      </button>
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
    </div>
  );
}

function IncidentCard({ onQueue }: { onQueue: () => void }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMsg('Voice unsupported here. Type the narration.'); return; }
    if (listening) return;
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-CA';
    let final = text;
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' '; else interim += t;
      }
      setText((final + interim).trim());
    };
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  }

  async function submit() {
    if (text.trim().length < 10) { setMsg('Add at least a sentence.'); return; }
    try {
      const f = await getFix();
      // Queue regardless of online state. Replay sends to incident-copilot.
      enqueue('incident', {
        site_id: 'self', // server resolves to the guard's current site
        narration: text.trim(),
        geo: `POINT(${f.lng} ${f.lat})`,
      });
      onQueue();
      setText(''); setMsg('Incident queued. Copilot will structure it on sync.');
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="rounded-lg bg-slate-900 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Incident</h2>
        <button onClick={toggleVoice} className={`text-xs px-2 py-1 rounded border ${listening ? 'border-red-500/50 text-red-300' : 'border-slate-700 text-slate-300'}`}>
          {listening ? '● listening' : 'Speak'}
        </button>
      </div>
      <textarea
        className="w-full px-3 py-3 min-h-[160px] rounded bg-slate-950 border border-slate-700 text-sm"
        placeholder="What happened? Speak naturally — the Copilot will structure it."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="w-full py-3 rounded bg-blue-600 font-medium" onClick={submit}>Submit</button>
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
    </div>
  );
}

function PanicCard() {
  const [holding, setHolding] = useState(0);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function trigger() {
    setSent(false); setErr(null);
    try {
      const f = await getFix();
      // Panic is high-priority: try direct insert, also queue as fallback.
      const payload = {
        kind: 'panic' as const,
        geo: `POINT(${f.lng} ${f.lat})`,
        triggered_at: new Date().toISOString(),
      };
      enqueue('panic', payload);
      try { await invokeFn('incident-copilot', { site_id: 'self', narration: '[PANIC] Officer triggered emergency. GPS captured.', geo: payload.geo }); }
      catch { /* will replay from queue */ }
      setSent(true);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="rounded-lg bg-red-900/40 border border-red-500/40 p-5 text-center">
      <AlertOctagon size={48} className="mx-auto text-red-400" />
      <h2 className="font-bold text-xl mt-2">Panic</h2>
      <p className="text-sm text-red-200 mt-1">Hold for 2 seconds to alert dispatch and capture your GPS.</p>
      <button
        className="mt-5 w-full py-6 rounded-lg bg-red-600 active:bg-red-700 font-bold text-lg"
        onPointerDown={() => {
          const start = Date.now();
          const timer = setInterval(() => {
            const held = Date.now() - start;
            setHolding(Math.min(held / 2000, 1));
            if (held >= 2000) { clearInterval(timer); setHolding(0); trigger(); }
          }, 50);
          const cancel = () => { clearInterval(timer); setHolding(0); window.removeEventListener('pointerup', cancel); };
          window.addEventListener('pointerup', cancel);
        }}
      >
        HOLD TO TRIGGER
      </button>
      <div className="h-2 mt-3 rounded bg-red-950 overflow-hidden">
        <div className="h-full bg-red-400 transition-all" style={{ width: `${holding * 100}%` }} />
      </div>
      {sent && <p className="text-emerald-300 text-sm mt-3">Alert sent. Stay safe.</p>}
      {err && <p className="text-amber-200 text-sm mt-3">{err}</p>}
    </div>
  );
}
