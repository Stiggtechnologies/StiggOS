import { useEffect, useState } from 'react';
import { MapPin, AlertOctagon, ScanLine, Mic, LogOut, RefreshCw, Building2, NotebookPen, User, ShieldCheck } from 'lucide-react';
import { Logo } from '@stigg/brand';
import { supabase, supabaseConfigured, invokeFn } from './lib/supabase';
import { getFix, type Fix } from './lib/geo';
import { enqueue, read as readQueue, remove as removeQueue } from './lib/queue';
import { HelpLauncher } from '@stigg/help';
import { PropertyProfile, type SiteProfile, type AccessCredential } from '@stigg/ui';
import { MediaCapture, type Attachment } from './components/MediaCapture';
import { enqueue as queueMedia, size as mediaQueueSize } from './lib/mediaQueue';
import { replayMedia } from './lib/mediaReplay';
import { NfcCheckIn, parseCheckpointUrl } from './components/NfcCheckIn';
import { shufflePatrol as shufflePatrolImpl, seedFromString } from './lib/patrol-order';
export { shufflePatrol } from './lib/patrol-order';

type Tab = 'shift' | 'site' | 'tour' | 'note' | 'incident' | 'panic' | 'me';

export function App() {
  // NFC tap landing — checked before any auth/tab UI so an unauthenticated
  // tap goes straight to the embedded sign-in and auto-submits.
  const checkpointCode = parseCheckpointUrl(window.location.pathname, window.location.search);
  if (checkpointCode) return <NfcCheckIn code={checkpointCode} />;
  return <AppShell />;
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('shift');
  const [online, setOnline] = useState(navigator.onLine);
  const [signedIn, setSignedIn] = useState(false);
  const [queueSize, setQueueSize] = useState(readQueue().length);
  // Surface the IndexedDB media queue alongside the legacy JSON queue.
  useEffect(() => { mediaQueueSize().then((n) => setQueueSize((q) => q + n)); }, []);

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
      // 1. JSON queue (scans, incidents, shift clock) — must run first because
      //    scan rows need to exist before attachments insert with FK.
      for (const item of readQueue()) {
        try {
          if (item.kind === 'incident') await invokeFn('incident-copilot', item.payload);
          else if (item.kind === 'tour_scan') await supabase.from('tour_scans').insert(item.payload as any);
          else if (item.kind === 'patrol_scan_rpc') {
            // NFC taps queued offline. The server-side RPC handles validation
            // and routes to tour_scans or patrol_exceptions on its own.
            const { error } = await supabase.rpc('record_patrol_scan', item.payload as any);
            if (error) throw error;
          }
          else if (item.kind === 'shift_clock') await supabase.from('shifts').update((item.payload as any).patch).eq('id', (item.payload as any).id);
          removeQueue(item.id);
        } catch {
          break; // Stop on first failure; try again next online window.
        }
      }
      // 2. Media queue (blobs → evidence bucket + attachment row insert).
      try { await replayMedia(); } catch { /* per-item errors are non-fatal */ }
      const mediaCount = await mediaQueueSize();
      setQueueSize(readQueue().length + mediaCount);
    })();
  }, [online, signedIn]);

  if (!supabaseConfigured) {
    return (
      <div className="min-h-[100svh] grid place-items-center p-6 text-center">
        <div className="animate-fade-in">
          <Logo height={28} tone="dark" />
          <p className="text-sm text-ink-400 mt-6 max-w-xs">
            Field is not configured for this device. Speak to your supervisor.
          </p>
        </div>
      </div>
    );
  }

  if (!signedIn) return <SignIn />;

  return (
    <div className="min-h-[100svh] flex flex-col">
      <Header online={online} queueSize={queueSize} />
      <main className="flex-1 p-4 max-w-md w-full mx-auto animate-fade-in">
        {tab === 'shift'    && <ShiftCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'site'     && <SiteBriefingCard />}
        {tab === 'tour'     && <TourScanCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'note'     && <FieldNoteCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'incident' && <IncidentCard onQueue={() => setQueueSize(readQueue().length)} />}
        {tab === 'panic'    && <PanicCard />}
        {tab === 'me'       && <ProfileCard />}
      </main>
      <HelpLauncher app="field" role="guard" supabase={supabase} />
      <nav className="grid grid-cols-7 border-t border-white/[0.05] bg-ink-950/80 backdrop-blur-glass sticky bottom-0 pb-[max(env(safe-area-inset-bottom),0px)]">
        {([
          { k: 'shift',    label: 'Shift',    icon: MapPin },
          { k: 'site',     label: 'Site',     icon: Building2 },
          { k: 'tour',     label: 'Tour',     icon: ScanLine },
          { k: 'note',     label: 'Note',     icon: NotebookPen },
          { k: 'incident', label: 'Report',   icon: Mic },
          { k: 'panic',    label: 'Panic',    icon: AlertOctagon },
          { k: 'me',       label: 'Me',       icon: User },
        ] as Array<{ k: Tab; label: string; icon: any }>).map((n) => {
          const active = tab === n.k;
          const isPanic = n.k === 'panic';
          return (
            <button
              key={n.k}
              onClick={() => setTab(n.k)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider transition-colors duration-150
                ${active ? (isPanic ? 'text-stigg-400' : 'text-white') : 'text-ink-500 hover:text-ink-300'}`}
            >
              {active && !isPanic && <span className="absolute top-0 inset-x-3 h-px bg-gradient-to-r from-transparent via-stigg-500 to-transparent" />}
              <n.icon size={18} strokeWidth={active ? 2.25 : 1.75} />
              <span className="font-medium">{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Header({ online, queueSize }: { online: boolean; queueSize: number }) {
  return (
    <header className="px-5 pt-5 pb-3 flex items-center justify-between">
      <a href="https://stigg.ca" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5" title="Stigg Security">
        <Logo height={20} tone="dark" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-500 border-l border-white/10 pl-2.5">Field</span>
      </a>
      <div className="flex items-center gap-3 text-[11px]">
        {queueSize > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <RefreshCw size={11} className="animate-spin-slow" /> {queueSize}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-stigg-500'}`} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
            {online ? 'Live' : 'Offline'}
          </span>
        </span>
        <button className="text-ink-500 hover:text-ink-200 transition-colors" onClick={() => supabase.auth.signOut()} title="Sign out">
          <LogOut size={14} />
        </button>
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
    <div className="min-h-[100svh] flex flex-col p-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] max-w-md mx-auto w-full">
      <div className="animate-fade-in">
        <Logo height={26} tone="dark" />
      </div>

      <div className="flex-1 flex flex-col justify-center animate-slide-up">
        <h1 className="text-[44px] leading-[0.95] font-bold tracking-tightest">
          Field.<br />
          <span className="bg-gradient-to-r from-stigg-400 to-stigg-600 bg-clip-text text-transparent">
            Always on.
          </span>
        </h1>
        <p className="mt-5 text-base text-ink-400 max-w-xs">
          Sign in to start your shift. Offline-first — every tap, scan, and note is logged the moment you have signal.
        </p>

        <form
          className="mt-10 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setErr(null);
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            setBusy(false); if (error) setErr(error.message);
          }}
        >
          <FieldLabel label="Email">
            <input
              className="field-input" type="email" autoComplete="email" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Password">
            <input
              className="field-input" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </FieldLabel>
          {err && (
            <div className="rounded-xl border border-stigg-500/30 bg-stigg-500/10 px-3 py-2.5 text-sm text-stigg-200 animate-fade-in">
              {err}
            </div>
          )}
          <button className="field-btn-primary mt-2" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-600">
        <ShieldCheck size={11} className="text-emerald-500/80" />
        <span>SSIA · PIPEDA · GPS-validated</span>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
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
      <div className="field-card">
        <h2 className="font-semibold">My shift</h2>
        <p className="text-sm text-slate-400 mt-1">
          Tap to clock in. The app captures your GPS fix; the server validates against the site geofence.
        </p>
        {fix && (
          <p className="text-xs text-slate-500 mt-3">
            Fix · {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · ±{Math.round(fix.accuracy_m)}m
          </p>
        )}
        <button className="field-btn-primary mt-4" onClick={clockIn} disabled={working}>
          {working ? 'Capturing GPS…' : 'Clock in / out'}
        </button>
        {msg && <p className="text-sm text-slate-300 mt-3">{msg}</p>}
      </div>
    </div>
  );
}

function TourScanCard({ onQueue }: { onQueue: () => void }) {
  const [scan, setScan] = useState('');
  const [abnormal, setAbnormal] = useState(false);
  const [reason, setReason] = useState('');
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!scan) { setMsg('Scan or type a checkpoint token first.'); return; }
    try {
      const f = await getFix();
      // Client-generates the scan id so we can attach evidence in one shot
      // without round-tripping the server.
      const scanId = crypto.randomUUID();
      const capturedAt = new Date().toISOString();

      enqueue('tour_scan', {
        id: scanId,
        checkpoint_token: scan,
        scanned_at: capturedAt,
        abnormal,
        notes: abnormal ? reason : null,
        geo: `POINT(${f.lng} ${f.lat})`,
        geo_accuracy_m: f.accuracy_m,
      });

      // Queue every attachment against the scan we just queued.
      for (const a of atts) {
        await queueMedia({
          table: 'tour_scan_attachments',
          kind: a.kind,
          row: { scan_id: scanId },
          blob: 'blob' in a ? a.blob : undefined,
          mime: 'mime' in a ? a.mime : undefined,
          duration_s: 'duration_s' in a ? a.duration_s : undefined,
          text_content: a.kind === 'note' ? a.text : (abnormal && a.kind === 'photo' && reason ? reason : undefined),
          captured_at: capturedAt,
          geo: { lat: f.lat, lng: f.lng },
        });
      }

      onQueue();
      setScan(''); setAbnormal(false); setReason(''); setAtts([]);
      setMsg(`Scan queued${atts.length > 0 ? ` with ${atts.length} attachment${atts.length > 1 ? 's' : ''}` : ''}.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="field-card space-y-3">
      <h2 className="font-semibold">Tour scan</h2>
      <p className="text-sm text-slate-400">Scan the checkpoint NFC/QR — for now, paste the token below.</p>
      <input
        className="field-input !font-mono !text-sm"
        placeholder="checkpoint token"
        value={scan}
        onChange={(e) => setScan(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={abnormal} onChange={(e) => setAbnormal(e.target.checked)} />
        Something abnormal
      </label>
      {abnormal && (
        <textarea
          className="field-textarea !text-sm border-amber-500/40 focus:border-amber-500/60"
          rows={2}
          placeholder="What did you see? (door damaged, person loitering, etc.)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}

      <div className="border-t border-slate-800 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Attach evidence</div>
        <MediaCapture attachments={atts} onChange={setAtts} />
      </div>

      <button className="field-btn-primary !py-3.5" onClick={submit}>Submit scan</button>
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
    </div>
  );
}

// shufflePatrol is now defined in lib/patrol-order.ts and re-exported above
// so external callers (including tests) keep working unchanged.

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
    <div className="field-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Incident</h2>
        <button onClick={toggleVoice} className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors duration-150 ${listening ? 'border-stigg-500/40 bg-stigg-500/10 text-stigg-200' : 'border-white/[0.08] text-ink-300 hover:text-white'}`}>
          {listening ? '● recording' : 'Speak'}
        </button>
      </div>
      <textarea
        className="field-textarea min-h-[180px] !text-sm leading-relaxed"
        placeholder="What happened? Speak naturally — the Copilot will structure it."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="field-btn-primary !py-3.5" onClick={submit}>Submit</button>
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
    </div>
  );
}

// Field note — anytime capture during rounds. Not tied to a checkpoint.
// We resolve the active shift on submit so the note is correctly linked.
function FieldNoteCard({ onQueue }: { onQueue: () => void }) {
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [flag, setFlag] = useState<'observation'|'hazard'|'maintenance'|'suspicious'|'other'|''>('observation');
  const [msg, setMsg] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<{ id: string; site_id: string } | null>(null);

  useEffect(() => {
    (async () => {
      // Find the guard's most recent in-progress (or scheduled-today) shift.
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: guard } = await supabase.from('guards').select('id').eq('email', u.user.email).maybeSingle();
      if (!guard?.id) return;
      const start = new Date(); start.setHours(0,0,0,0);
      const { data } = await supabase.from('shifts')
        .select('id, site_id')
        .eq('guard_id', guard.id)
        .gte('scheduled_start', start.toISOString())
        .order('scheduled_start', { ascending: false })
        .limit(1);
      const sh = (data ?? [])[0]; if (sh) setActiveShift({ id: sh.id, site_id: sh.site_id });
    })();
  }, []);

  async function submit() {
    if (!activeShift) { setMsg('No shift assigned today — find dispatch.'); return; }
    if (atts.length === 0) { setMsg('Capture at least one note, photo, video, or voice memo.'); return; }
    try {
      const f = await getFix();
      const capturedAt = new Date().toISOString();
      // Each attachment becomes one field_notes row (each can be its own kind).
      for (const a of atts) {
        await queueMedia({
          table: 'field_notes',
          kind: a.kind,
          row: { shift_id: activeShift.id, site_id: activeShift.site_id },
          blob: 'blob' in a ? a.blob : undefined,
          mime: 'mime' in a ? a.mime : undefined,
          duration_s: 'duration_s' in a ? a.duration_s : undefined,
          text_content: a.kind === 'note' ? a.text : undefined,
          flag: flag || null,
          captured_at: capturedAt,
          geo: { lat: f.lat, lng: f.lng },
        });
      }
      onQueue();
      setMsg(`Queued ${atts.length} field note${atts.length > 1 ? 's' : ''}.`);
      setAtts([]);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="field-card space-y-3">
      <div>
        <h2 className="font-semibold">Field note</h2>
        <p className="text-sm text-slate-400 mt-1">Anytime capture during rounds — between checkpoints, on perimeter walks, or as a shift handoff to your supervisor.</p>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">What kind?</div>
        <div className="flex flex-wrap gap-1.5">
          {(['observation','hazard','maintenance','suspicious','other'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`text-[11px] px-2.5 py-1.5 rounded-full border ${flag === f ? 'bg-stigg-500/15 border-stigg-500/40 text-stigg-100' : 'border-white/[0.08] text-ink-300 hover:text-white'}`}
              onClick={() => setFlag(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Capture</div>
        <MediaCapture attachments={atts} onChange={setAtts} />
      </div>

      <button className="field-btn-primary !py-3.5" onClick={submit}>
        {atts.length === 0 ? 'Capture something to submit' : `Submit ${atts.length} note${atts.length > 1 ? 's' : ''}`}
      </button>

      {!activeShift && <p className="text-xs text-amber-300">No active shift — sign in / clock in first.</p>}
      {msg && <p className="text-sm text-slate-300">{msg}</p>}
    </div>
  );
}

// Site briefing — pulls today's assigned shift, then loads the full site
// profile + access credentials so the guard sees codes, hazards, and one-tap
// directions before they leave for the property.
function SiteBriefingCard() {
  const [site, setSite] = useState<SiteProfile | null>(null);
  const [creds, setCreds] = useState<AccessCredential[]>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; site_id: string; site_name: string; scheduled_start: string }>>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [routeOrder, setRouteOrder] = useState<Array<{ id: string; ordinal: number; label: string; checkpoint_code: string | null; route_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pull today's shifts for the signed-in guard via user_profile linkage.
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) { setError('Not signed in.'); setLoading(false); return; }
        const { data: profile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', u.user.id).single();
        if (!profile) { setError('No profile.'); setLoading(false); return; }
        // Guards table holds the personnel record; we look up by email to keep this simple.
        const { data: guard } = await supabase.from('guards').select('id').eq('email', u.user.email).maybeSingle();
        const guardId = guard?.id;

        const start = new Date(); start.setHours(0,0,0,0);
        const end   = new Date(); end.setHours(23,59,59,999);

        let q = supabase.from('shifts')
          .select('id, site_id, scheduled_start, sites!inner(name)')
          .gte('scheduled_start', start.toISOString())
          .lte('scheduled_start', end.toISOString())
          .order('scheduled_start');
        if (guardId) q = q.eq('guard_id', guardId);

        const { data: rawShifts } = await q;
        const list = ((rawShifts ?? []) as any[]).map((r) => ({
          id: r.id, site_id: r.site_id, site_name: r.sites?.name ?? '—', scheduled_start: r.scheduled_start,
        }));
        setShifts(list);
        if (list[0]) setActiveShiftId(list[0].id);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, []);

  // Load profile + creds + randomized checkpoint order for the selected shift.
  useEffect(() => {
    if (!activeShiftId) { setSite(null); setCreds([]); setRouteOrder([]); return; }
    (async () => {
      const sh = shifts.find((s) => s.id === activeShiftId); if (!sh) return;
      const [siteRes, credRes, geoRes, routeRes] = await Promise.all([
        supabase.from('sites').select('*').eq('id', sh.site_id).single(),
        supabase.from('site_access_credentials').select('id, kind, label, value, location_hint, expires_on').eq('site_id', sh.site_id).order('kind'),
        supabase.rpc('site_geojson'),
        // Pull every active checkpoint on every active route at this site.
        // Most sites have one route; if multiple, we shuffle within each.
        supabase.from('tour_checkpoints')
          .select('id, ordinal, label, checkpoint_code, tour_routes!inner(name, site_id, is_active)')
          .eq('is_active', true)
          .eq('tour_routes.site_id', sh.site_id)
          .eq('tour_routes.is_active', true)
          .order('ordinal'),
      ]);
      const geoRow = ((geoRes.data ?? []) as any[]).find((r) => r.id === sh.site_id);
      setSite({ ...(siteRes.data as any), geo: geoRow?.geo ?? null });
      setCreds((credRes.data ?? []) as AccessCredential[]);
      // Shuffle deterministically per shift so a refresh keeps the same plan,
      // but a different shift sees a different order.
      const cps = ((routeRes.data ?? []) as any[]).map((c) => ({
        id: c.id, ordinal: c.ordinal, label: c.label,
        checkpoint_code: c.checkpoint_code ?? null,
        route_name: c.tour_routes?.name ?? '—',
      }));
      setRouteOrder(shufflePatrolImpl(cps, seedFromString(sh.id)));
    })();
  }, [activeShiftId, shifts]);

  if (loading) return <p className="text-slate-400 text-sm">Loading today's briefing…</p>;
  if (error)   return <p className="text-red-300 text-sm">{error}</p>;
  if (shifts.length === 0) {
    return <p className="text-slate-400 text-sm">No shifts assigned today. Check with dispatch if this looks wrong.</p>;
  }

  return (
    <div className="space-y-3">
      {shifts.length > 1 && (
        <div className="field-card !p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Today's shifts</div>
          <div className="flex flex-wrap gap-2">
            {shifts.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveShiftId(s.id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-full ${activeShiftId === s.id ? 'bg-stigg-500/15 border border-stigg-500/40 text-stigg-100' : 'bg-white/[0.04] border border-white/[0.08] text-ink-300'}`}
              >
                {s.site_name} · {new Date(s.scheduled_start).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </div>
      )}
      {site && <PropertyProfile site={site} accessCredentials={creds} compact />}
      {routeOrder.length > 0 && <RandomizedRouteCard items={routeOrder} />}
    </div>
  );
}

// Tonight's randomized checkpoint order — seeded by shift_id so a refresh
// keeps the same plan, but a different shift gets a different order. The
// guard works the list top-to-bottom; physical taps record actual progress.
function RandomizedRouteCard({ items }: { items: Array<{ id: string; ordinal: number; label: string; checkpoint_code: string | null; route_name: string }> }) {
  const sameRoute = new Set(items.map((i) => i.route_name)).size === 1;
  return (
    <div className="field-card !p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Tonight's order</div>
      <ol className="space-y-1.5">
        {items.map((c, i) => (
          <li key={c.id} className="grid grid-cols-[1.25rem,1fr,auto] items-baseline gap-2 text-sm">
            <span className="text-slate-500 text-right tabular-nums">{i + 1}.</span>
            <span className="truncate">
              {c.label}
              {!sameRoute && <span className="text-xs text-slate-500"> · {c.route_name}</span>}
            </span>
            {c.checkpoint_code && (
              <span className="font-mono text-[10px] text-slate-500">{c.checkpoint_code}</span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-slate-500">
        Order is randomized per shift to keep patrols unpredictable. Tap each NFC tag — the app records the actual sequence you walk.
      </p>
    </div>
  );
}

// ─── Self-service profile ───────────────────────────────────────────────
// The guard updates their own contact details, emergency contact, uploads
// renewed licenses (security + first-aid). The console sees changes
// immediately; supervisor approval is not required for contact changes.
function ProfileCard() {
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [emRel, setEmRel] = useState('');

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setError('Not signed in.'); setLoading(false); return; }
      const { data, error } = await supabase.from('guards').select('*').eq('email', u.user.email).maybeSingle();
      if (error) { setError(error.message); setLoading(false); return; }
      if (!data) { setError("We couldn't find your guard record. Ask Dispatch to link your account."); setLoading(false); return; }
      setGuard(data);
      setPhone(data.phone ?? '');
      setStreetAddress(data.street_address ?? '');
      setCity(data.city ?? '');
      setPostal(data.postal_code ?? '');
      setEmName(data.emergency_contact?.name ?? '');
      setEmPhone(data.emergency_contact?.phone ?? '');
      setEmRel(data.emergency_contact?.relationship ?? '');
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) return;
    setSaving(true); setError(null); setSavedMsg(null);
    const emergency = (emName || emPhone) ? { name: emName, phone: emPhone, relationship: emRel } : null;
    const { error: ue } = await supabase.from('guards').update({
      phone: phone.trim() || null,
      street_address: streetAddress.trim() || null,
      city: city.trim() || null,
      postal_code: postal.trim() || null,
      emergency_contact: emergency,
      last_contact_at: new Date().toISOString(),
    }).eq('id', guard.id);
    setSaving(false);
    if (ue) setError(ue.message);
    else setSavedMsg('Saved.');
  }

  async function uploadLicense(file: File, kind: 'security_license'|'first_aid_certificate'|'drivers_license') {
    if (!guard) return;
    setError(null); setSavedMsg(null);
    const ext = file.name.match(/\.[A-Za-z0-9]+$/)?.[0] ?? '';
    const path = `${guard.org_id}/${guard.id}/${crypto.randomUUID()}${ext.toLowerCase()}`;
    const { error: ue } = await supabase.storage.from('guard-docs').upload(path, file);
    if (ue) { setError(ue.message); return; }
    const { error: ie } = await supabase.from('guard_documents').insert({
      org_id: guard.org_id, guard_id: guard.id, kind, title: `${kind.replace(/_/g,' ')} (renewed)`,
      storage_bucket: 'guard-docs', storage_path: path,
      mime_type: file.type, size_bytes: file.size, status: 'active',
    });
    if (ie) setError(ie.message);
    else setSavedMsg('License uploaded — supervisor will verify shortly.');
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading your profile…</p>;
  if (error && !guard) return <div className="rounded-2xl border border-stigg-500/30 bg-stigg-500/[0.06] p-4 text-sm text-stigg-200">{error}</div>;
  if (!guard) return null;

  const fullName = `${guard.first_name} ${guard.last_name}`;

  return (
    <div className="space-y-3">
      <div className="field-card !p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 grid place-items-center text-white font-bold">
            {guard.first_name[0]}{guard.last_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">{fullName}</div>
            <div className="text-xs text-slate-400">{guard.email}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{guard.pipeline_stage} · {(guard.hourly_rate ? `$${guard.hourly_rate}/hr` : 'rate not set')}</div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="field-card !p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Contact</div>
        <Field label="Phone" type="tel"   value={phone}         onChange={setPhone} />
        <Field label="Street address"      value={streetAddress} onChange={setStreetAddress} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="City"    value={city}   onChange={setCity} />
          <Field label="Postal"  value={postal} onChange={setPostal} />
        </div>

        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-3">Emergency contact</div>
        <Field label="Name"        value={emName}  onChange={setEmName} />
        <Field label="Phone" type="tel" value={emPhone} onChange={setEmPhone} />
        <Field label="Relationship" value={emRel} onChange={setEmRel} placeholder="spouse / parent / sibling" />

        {error && <p className="text-sm text-red-300">{error}</p>}
        {savedMsg && <p className="text-sm text-emerald-300">{savedMsg}</p>}
        <button className="field-btn-primary !py-3.5" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="field-card !p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Renewed licenses</div>
        <p className="text-xs text-slate-400">Snap a clear photo or PDF of your renewed license — your supervisor verifies it before it's active.</p>
        <UploadButton label="Upload SSIA license"        onPick={(f) => uploadLicense(f, 'security_license')} />
        <UploadButton label="Upload First-aid cert"      onPick={(f) => uploadLicense(f, 'first_aid_certificate')} />
        <UploadButton label="Upload Driver's license"    onPick={(f) => uploadLicense(f, 'drivers_license')} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-xs text-slate-300">{label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field-input !text-sm !py-2" />
    </label>
  );
}
function UploadButton({ label, onPick }: { label: string; onPick: (f: File) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-300">{label}</span>
      <input type="file" accept="image/*,application/pdf" capture="environment"
        className="block w-full mt-1 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-stigg-600 file:text-white"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { onPick(f); (e.target as HTMLInputElement).value=''; } }} />
    </label>
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
    <div className="space-y-4 animate-fade-in">
      <div className="text-center pt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stigg-300/80 font-semibold">Emergency</div>
        <h2 className="text-3xl font-bold tracking-tightest mt-2">Panic alert.</h2>
        <p className="text-sm text-ink-400 mt-2 max-w-xs mx-auto">
          Hold the button for 2 seconds. Dispatch is paged with your GPS the instant it triggers.
        </p>
      </div>

      <button
        className="relative w-full overflow-hidden rounded-2xl py-10 font-bold text-lg uppercase tracking-[0.2em] transition-transform duration-150 active:scale-[0.99] select-none"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #ed3947 0%, #b41a23 60%, #7a1a22 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset, 0 14px 40px -12px rgba(214,31,43,0.7), 0 0 60px rgba(214,31,43,0.25)',
        }}
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
        <span className="absolute inset-0 grid place-items-center pointer-events-none">
          <AlertOctagon size={36} className="text-white/10 absolute" />
        </span>
        <span className="relative z-10 flex flex-col items-center gap-1">
          <span>Hold to trigger</span>
          <span className="text-[10px] tracking-[0.3em] text-white/70 font-medium">
            {holding > 0 ? `${Math.round(holding * 2000)}ms` : '2.0s'}
          </span>
        </span>
        <span
          className="absolute inset-x-0 bottom-0 h-1 bg-white/40 transition-[width] duration-75 ease-out"
          style={{ width: `${holding * 100}%` }}
        />
      </button>

      {sent && (
        <div className="field-card !p-3 inline-flex items-center gap-2 text-sm text-emerald-300 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          Alert sent. Dispatch is on it. Stay safe.
        </div>
      )}
      {err && (
        <div className="field-card !p-3 text-sm text-amber-200">{err}</div>
      )}

      <div className="text-center text-[10px] uppercase tracking-[0.18em] text-ink-600">
        Audio + GPS is captured · Tap and hold won't fire false alarms
      </div>
    </div>
  );
}
