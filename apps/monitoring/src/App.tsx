// Virtual Security Guard — operator console.
//   • Camera grid (live thumbnails by default; click to expand to RTSP/WebRTC).
//   • Live alert stream (Supabase Realtime on camera_alerts).
//   • Triage panel: dismiss / escalate-to-incident / mark false positive.
//   • Talk-down composer for one-click TTS messages.
//
// Camera streaming itself is intentionally out of scope here — that requires
// a media gateway (LiveKit/Janus). The schema and triage workflow are real;
// the video tile shows a static thumbnail from `cameras.last_seen_at`.

import { useEffect, useState } from 'react';
import { Camera, AlertTriangle, MessageSquare, Mic, Volume2, ShieldAlert, X, Wifi, WifiOff } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';
import type { CameraAlert } from '@stigg/shared';

interface CameraRow {
  id: string;
  label: string;
  site_id: string;
  online: boolean;
  ai_features: string[];
  last_seen_at: string | null;
}

export function App() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [alerts, setAlerts] = useState<CameraAlert[]>([]);
  const [selected, setSelected] = useState<CameraAlert | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); return; }
    const [{ data: cams }, { data: a }] = await Promise.all([
      supabase.from('cameras').select('id, label, site_id, online, ai_features, last_seen_at'),
      supabase.from('camera_alerts').select('*').eq('triage_status', 'pending').order('detected_at', { ascending: false }).limit(50),
    ]);
    setCameras((cams ?? []) as CameraRow[]);
    setAlerts((a ?? []) as CameraAlert[]);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('vsg-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_alerts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function triage(alert: CameraAlert, status: 'dismissed' | 'escalated' | 'false_positive' | 'resolved') {
    await supabase.from('camera_alerts').update({
      triage_status: status,
      triaged_at: new Date().toISOString(),
    }).eq('id', alert.id);
    setSelected(null);
  }

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen grid place-items-center bg-black text-slate-200">
        <div className="text-center">
          <ShieldAlert size={32} className="mx-auto text-amber-400" />
          <p className="mt-2">Supabase is not configured. Monitoring is offline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Camera size={18} className="text-blue-400" />
          <span className="font-semibold">Stigg Virtual Guarding</span>
          <span className="text-xs text-slate-500 ml-2">{cameras.length} cameras · {alerts.length} pending alerts</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Wifi size={14} className="text-emerald-400" />
          <span>Operator on-shift</span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-3 p-3">
        <section className="col-span-8 grid grid-cols-3 auto-rows-[180px] gap-2">
          {cameras.length === 0 && (
            <div className="col-span-3 text-slate-500 text-sm flex items-center justify-center">
              No cameras yet. Add cameras under Settings to populate the grid.
            </div>
          )}
          {cameras.map((c) => (
            <CameraTile key={c.id} cam={c} alerts={alerts.filter((a) => a.camera_id === c.id)} />
          ))}
        </section>

        <section className="col-span-4 rounded-lg border border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 text-slate-200">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="font-medium">Live alert stream</span>
            <span className="ml-auto text-xs text-slate-500">{alerts.length} pending</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {error && <div className="p-4 text-sm text-red-300">{error}</div>}
            {alerts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-900 ${selected?.id === a.id ? 'bg-slate-900' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100">{a.detection_type}</span>
                  <span className="text-xs text-slate-500">
                    {Math.round((a.confidence ?? 0) * 100)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(a.detected_at).toLocaleTimeString()} · cam {a.camera_id.slice(0, 6)}
                </div>
                {a.ai_summary && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.ai_summary}</p>
                )}
              </button>
            ))}
            {alerts.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">
                No pending alerts. AI camera detections will appear here in real-time.
              </div>
            )}
          </div>
        </section>
      </main>

      {selected && <TriageDrawer alert={selected} onClose={() => setSelected(null)} onTriage={triage} />}
    </div>
  );
}

function CameraTile({ cam, alerts }: { cam: CameraRow; alerts: CameraAlert[] }) {
  const stale = !cam.last_seen_at || (Date.now() - Date.parse(cam.last_seen_at) > 5 * 60 * 1000);
  return (
    <div className={`relative rounded border ${cam.online && !stale ? 'border-slate-800' : 'border-amber-500/40'} bg-slate-950 overflow-hidden`}>
      <div className="absolute inset-0 grid place-items-center text-slate-700">
        {cam.online ? <Camera size={28} /> : <WifiOff size={20} />}
      </div>
      {alerts.length > 0 && (
        <div className="absolute top-1 right-1 px-2 py-0.5 rounded text-[10px] bg-red-500/80 text-white font-semibold">
          {alerts.length}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/70 text-xs">
        <div className="text-slate-200 truncate">{cam.label}</div>
        <div className="text-[10px] text-slate-500 flex justify-between">
          <span>{cam.ai_features.slice(0, 2).join(' · ') || '—'}</span>
          <span className={cam.online && !stale ? 'text-emerald-400' : 'text-amber-400'}>
            {cam.online && !stale ? 'live' : 'offline'}
          </span>
        </div>
      </div>
    </div>
  );
}

function TriageDrawer({
  alert, onClose, onTriage,
}: {
  alert: CameraAlert;
  onClose: () => void;
  onTriage: (a: CameraAlert, s: 'dismissed' | 'escalated' | 'false_positive' | 'resolved') => void;
}) {
  const [talkdown, setTalkdown] = useState('Attention — you are on private property under live monitoring. Please leave the area immediately.');
  return (
    <aside className="fixed inset-y-0 right-0 w-[420px] bg-slate-950 border-l border-slate-800 z-50 flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Alert {alert.id.slice(0,8)}</div>
          <div className="font-medium">{alert.detection_type}</div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
      </header>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="aspect-video rounded bg-slate-900 grid place-items-center text-slate-700">
          <Camera size={36} />
        </div>
        <div className="text-sm">
          <div><span className="text-slate-500">Detected:</span> {new Date(alert.detected_at).toLocaleString()}</div>
          <div><span className="text-slate-500">Confidence:</span> {Math.round((alert.confidence ?? 0) * 100)}%</div>
          <div><span className="text-slate-500">Camera:</span> <code>{alert.camera_id.slice(0,8)}</code></div>
        </div>
        {alert.ai_summary && (
          <div className="rounded border border-slate-800 bg-slate-900 p-3 text-sm">
            <div className="text-xs text-blue-400 mb-1">AI summary</div>
            {alert.ai_summary}
          </div>
        )}

        <div className="rounded border border-slate-800 bg-slate-900 p-3 space-y-2">
          <div className="text-xs text-slate-400 flex items-center gap-1"><Volume2 size={12} /> Talk-down</div>
          <textarea
            className="w-full px-2 py-2 rounded bg-slate-950 border border-slate-700 text-xs"
            rows={3}
            value={talkdown}
            onChange={(e) => setTalkdown(e.target.value)}
          />
          <button className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium inline-flex items-center justify-center gap-2">
            <Mic size={14} /> Send TTS to site speaker
          </button>
          <p className="text-[10px] text-slate-500">In production, this calls the site's audio gateway (LiveKit/Janus). Logged to talkdown_events.</p>
        </div>
      </div>

      <footer className="border-t border-slate-800 p-3 grid grid-cols-2 gap-2">
        <button className="py-2 rounded bg-slate-800 text-slate-200 text-sm" onClick={() => onTriage(alert, 'false_positive')}>False positive</button>
        <button className="py-2 rounded bg-slate-800 text-slate-200 text-sm" onClick={() => onTriage(alert, 'dismissed')}>Dismiss</button>
        <button className="py-2 rounded bg-emerald-600 text-white text-sm" onClick={() => onTriage(alert, 'resolved')}>Resolved</button>
        <button className="py-2 rounded bg-red-600 text-white text-sm inline-flex items-center justify-center gap-1" onClick={() => onTriage(alert, 'escalated')}>
          <MessageSquare size={14} /> Escalate to incident
        </button>
      </footer>
    </aside>
  );
}
