// NFC tap landing. The tag URL hits /p/:code in this PWA. We:
//   1. Capture GPS in the background (high-accuracy, with timeout).
//   2. If signed in → call record_patrol_scan immediately.
//   3. If offline   → queue the call so replay handles it on next online.
//   4. If signed out → show a compact sign-in form, then auto-submit on auth.
//
// Server-side validation handles the hard part (radius, shift window, dup
// suppression). The client's job is to capture the truth as observed and
// surface the verdict the server returns.

import { useEffect, useRef, useState } from 'react';
import { Shield, MapPin, CheckCircle2, AlertTriangle, WifiOff, Loader2, Camera } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { getFix, type Fix } from '../lib/geo';
import { enqueue } from '../lib/queue';
import { enqueue as queueMedia } from '../lib/mediaQueue';
import { replayMedia } from '../lib/mediaReplay';
import { readPhotoFromFile } from '../lib/media';
export { parseCheckpointUrl } from '../lib/checkpoint-url';

type Phase =
  | { kind: 'init' }
  | { kind: 'auth' }                                          // not signed in yet
  | { kind: 'capturing' }                                     // getting GPS
  | { kind: 'submitting' }                                    // calling RPC
  | { kind: 'queued' }                                        // offline → queued
  | { kind: 'accepted'; result: AcceptedResult }
  | { kind: 'flagged'; result: FlaggedResult }
  | { kind: 'error'; message: string };

interface AcceptedResult {
  message: string;
  scan_id: string | null;
  checkpoint_label: string | null;
  site_name: string | null;
  scanned_at: string;
  distance_m: number | null;
  progress: { completed: number; total: number } | null;
  next_checkpoint: string | null;
  photo_required: boolean;
  geo: { lat: number; lng: number };
}

interface FlaggedResult {
  kind: string;
  message: string;
  distance_m?: number;
  allowed_radius_m?: number;
}

export function NfcCheckIn({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'init' });
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const submittedRef = useRef(false);

  // 1. Watch auth state.
  useEffect(() => {
    if (!supabaseConfigured) {
      setPhase({ kind: 'error', message: 'Supabase not configured. Speak to your supervisor.' });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setAuthChecked(true);
    });
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  // 2. Once we know auth state, drive the flow.
  useEffect(() => {
    if (!authChecked) return;
    if (phase.kind !== 'init') return;
    if (!signedIn) { setPhase({ kind: 'auth' }); return; }
    void runCheckIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, signedIn]);

  async function runCheckIn() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    let fix: Fix | null = null;
    try {
      setPhase({ kind: 'capturing' });
      fix = await getFix(15_000);
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Could not capture GPS.' });
      submittedRef.current = false;
      return;
    }

    const payload = {
      p_code:         code,
      p_lat:          fix.lat,
      p_lng:          fix.lng,
      p_accuracy_m:   fix.accuracy_m,
      p_scanned_at:   fix.captured_at,
      p_device_label: deviceLabel(),
    };

    if (!navigator.onLine) {
      enqueue('patrol_scan_rpc', payload);
      setPhase({ kind: 'queued' });
      return;
    }

    setPhase({ kind: 'submitting' });
    const { data, error } = await supabase.rpc('record_patrol_scan', payload);
    if (error) {
      // Network blip mid-call — queue for replay rather than losing the tap.
      enqueue('patrol_scan_rpc', payload);
      setPhase({ kind: 'queued' });
      return;
    }
    const result = data as any;
    if (result?.status === 'accepted') {
      setPhase({ kind: 'accepted', result: {
        message:          result.message,
        scan_id:          result.scan_id ?? null,
        checkpoint_label: result.checkpoint_label,
        site_name:        result.site_name,
        scanned_at:       result.scanned_at,
        distance_m:       result.distance_m ?? null,
        progress:         result.progress ?? null,
        next_checkpoint:  result.next_checkpoint ?? null,
        photo_required:   !!result.photo_required && !result.has_photo,
        geo:              { lat: fix.lat, lng: fix.lng },
      }});
    } else {
      setPhase({ kind: 'flagged', result: {
        kind:             result?.kind ?? 'other',
        message:          result?.message ?? 'Scan flagged.',
        distance_m:       result?.distance_m,
        allowed_radius_m: result?.allowed_radius_m,
      }});
    }
  }

  function retry() {
    submittedRef.current = false;
    setPhase({ kind: 'init' });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <Shield size={18} className="text-blue-500" />
        <span className="font-semibold">Stigg Patrol</span>
        <span className="ml-auto font-mono text-[11px] text-slate-500">{code}</span>
      </header>
      <main className="p-5 max-w-md mx-auto">
        {phase.kind === 'init'       && <Skeleton />}
        {phase.kind === 'auth'       && <SignInPanel onSignedIn={() => setSignedIn(true)} />}
        {phase.kind === 'capturing'  && <Working label="Capturing GPS…" />}
        {phase.kind === 'submitting' && <Working label="Recording check-in…" />}
        {phase.kind === 'queued'     && <Queued />}
        {phase.kind === 'accepted'   && <Accepted result={phase.result} />}
        {phase.kind === 'flagged'    && <Flagged result={phase.result} onRetry={retry} />}
        {phase.kind === 'error'      && <ErrorPanel message={phase.message} onRetry={retry} />}
      </main>
    </div>
  );
}

// ─── Subviews ────────────────────────────────────────────────────────────────

function Skeleton() {
  return <div className="space-y-3"><div className="h-4 bg-slate-900 rounded w-2/3" /><div className="h-4 bg-slate-900 rounded w-1/2" /></div>;
}

function Working({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-slate-900 p-6 text-center">
      <Loader2 className="mx-auto animate-spin text-blue-400" size={28} />
      <p className="mt-3 text-sm text-slate-300">{label}</p>
    </div>
  );
}

function Queued() {
  return (
    <div className="rounded-lg bg-slate-900 p-6 text-center">
      <WifiOff className="mx-auto text-amber-400" size={28} />
      <h2 className="mt-2 font-semibold">Queued offline</h2>
      <p className="mt-2 text-sm text-slate-400">
        Saved on this device. Will send to dispatch when you have signal.
        Keep moving.
      </p>
    </div>
  );
}

function Accepted({ result }: { result: AcceptedResult }) {
  const time = new Date(result.scanned_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-emerald-900/30 border border-emerald-500/40 p-5">
        <CheckCircle2 className="text-emerald-400" size={32} />
        <h2 className="mt-2 font-bold text-lg">Checkpoint confirmed</h2>
        <dl className="mt-4 grid grid-cols-[6rem,1fr] gap-y-1 text-sm">
          <dt className="text-slate-400">Site</dt>          <dd>{result.site_name ?? '—'}</dd>
          <dt className="text-slate-400">Checkpoint</dt>    <dd>{result.checkpoint_label ?? '—'}</dd>
          <dt className="text-slate-400">Time</dt>          <dd>{time}</dd>
          {result.distance_m != null && (<>
            <dt className="text-slate-400">Distance</dt>    <dd>{result.distance_m} m</dd>
          </>)}
          {result.progress && (<>
            <dt className="text-slate-400">Progress</dt>    <dd>{result.progress.completed} of {result.progress.total} checkpoints</dd>
          </>)}
          {result.next_checkpoint && (<>
            <dt className="text-slate-400">Next</dt>        <dd>{result.next_checkpoint}</dd>
          </>)}
        </dl>
      </div>
      {result.photo_required && result.scan_id && (
        <PhotoRequiredPanel scanId={result.scan_id} geo={result.geo} />
      )}
    </div>
  );
}

// ─── Photo-required follow-up ───────────────────────────────────────────────
//
// Triggered when the checkpoint has photo_required = true AND the RPC didn't
// already receive a photo URL. The scan is already recorded — this attaches
// supporting evidence after the fact via tour_scan_attachments. Uses the
// existing media queue + replay so the upload survives a network blip.

function PhotoRequiredPanel({ scanId, geo }: { scanId: string; geo: { lat: number; lng: number } }) {
  const [state, setState] = useState<'idle' | 'attaching' | 'attached' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File) {
    setState('attaching'); setErr(null);
    try {
      const cap = await readPhotoFromFile(file);
      await queueMedia({
        table:        'tour_scan_attachments',
        kind:         'photo',
        row:          { scan_id: scanId },
        blob:         cap.blob,
        mime:         cap.mime,
        captured_at:  new Date().toISOString(),
        geo,
      });
      // Try to drain immediately — we're online (we got an RPC response just
      // now). If anything fails, the queue keeps the blob and AppShell will
      // replay later.
      const r = await replayMedia();
      if (r.failed > 0 && r.uploaded === 0) {
        setState('idle');
        setErr(r.errors[0] ?? 'Upload failed. Will retry when online.');
        return;
      }
      setState('attached');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (state === 'attached') {
    return (
      <div className="rounded-lg bg-emerald-900/20 border border-emerald-500/30 p-4 text-sm text-emerald-200 inline-flex items-center gap-2">
        <CheckCircle2 size={16} /> Photo attached.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 p-4">
      <div className="flex items-center gap-2">
        <Camera className="text-amber-300" size={20} />
        <h3 className="font-semibold">Photo required</h3>
      </div>
      <p className="text-xs text-slate-300 mt-1">
        This checkpoint requires a photo each round. Take one before you leave.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Capture photo</span>
        <input
          type="file" accept="image/*" capture="environment"
          className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { void onPick(f); (e.target as HTMLInputElement).value = ''; } }}
        />
      </label>
      {state === 'attaching' && <p className="mt-2 text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> uploading…</p>}
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
    </div>
  );
}

function Flagged({ result, onRetry }: { result: FlaggedResult; onRetry: () => void }) {
  return (
    <div className="rounded-lg bg-amber-900/30 border border-amber-500/40 p-5">
      <AlertTriangle className="text-amber-400" size={32} />
      <h2 className="mt-2 font-bold text-lg">Scan flagged</h2>
      <p className="mt-2 text-sm text-slate-200">{result.message}</p>
      {result.kind === 'out_of_range' && result.distance_m != null && (
        <p className="mt-2 text-xs text-slate-400">
          You are <span className="font-semibold text-amber-300">{result.distance_m}m</span> away.
          Allowed radius is {result.allowed_radius_m}m.
        </p>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Recorded for supervisor review. If this is wrong (broken GPS, wrong code),
        rescan at the correct point.
      </p>
      <button onClick={onRetry} className="mt-4 w-full py-3 rounded bg-blue-600 font-medium">
        Try again
      </button>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg bg-red-900/30 border border-red-500/40 p-5">
      <AlertTriangle className="text-red-400" size={32} />
      <h2 className="mt-2 font-bold text-lg">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-200">{message}</p>
      <button onClick={onRetry} className="mt-4 w-full py-3 rounded bg-blue-600 font-medium">Retry</button>
    </div>
  );
}

function SignInPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setErr(error.message);
        else onSignedIn();
      }}
    >
      <div className="rounded-lg bg-slate-900 p-4">
        <MapPin className="text-blue-400" size={28} />
        <h2 className="mt-2 font-bold text-lg">Sign in to check in</h2>
        <p className="text-sm text-slate-400 mt-1">
          One sign-in per shift — every tap after that is automatic.
        </p>
      </div>
      <input className="w-full px-3 py-3 rounded bg-slate-900 border border-slate-700"
        type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full px-3 py-3 rounded bg-slate-900 border border-slate-700"
        type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button className="w-full py-3 rounded bg-blue-600 font-medium" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in & check in'}
      </button>
    </form>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deviceLabel(): string {
  // Best-effort device descriptor — not unique, just helpful for triage.
  const ua = navigator.userAgent;
  const m = ua.match(/(iPhone|iPad|Android|Mac OS X|Windows)/i);
  return m?.[1] ?? 'Web';
}

