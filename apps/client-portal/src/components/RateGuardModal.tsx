// Customer-facing modal: rate or flag a specific guard from a shift/incident.
// Inserts directly into guard_commendations (RLS lets clients insert with
// their own client_id only).

import { useState } from 'react';
import { Star, X, Send, Loader2, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface RateGuardModalProps {
  guardId: string;
  guardName: string;
  siteId?: string | null;
  shiftId?: string | null;
  clientId: string;
  orgId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RateGuardModal({ guardId, guardName, siteId, shiftId, clientId, orgId, onClose, onSubmitted }: RateGuardModalProps) {
  const [kind, setKind] = useState<'commendation'|'complaint'>('commendation');
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) { setErr('please add a few words of detail'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('guard_commendations').insert({
      org_id: orgId,
      guard_id: guardId,
      kind,
      source: 'client_portal',
      client_id: clientId,
      site_id: siteId ?? null,
      shift_id: shiftId ?? null,
      rating: kind === 'commendation' ? rating : null,
      severity: kind === 'complaint' ? (rating <= 2 ? 'high' : 'medium') : null,
      title: title.trim() || (kind === 'commendation' ? `Great job: ${guardName}` : `Concern about ${guardName}`),
      description: description.trim(),
      occurred_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) setErr(error.message); else onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white border border-ink-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
          <h2 className="font-semibold text-ink-900">Rate {guardName}</h2>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-900"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind('commendation')}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${kind === 'commendation' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
              <ThumbsUp size={14} /> Commendation
            </button>
            <button type="button" onClick={() => setKind('complaint')}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${kind === 'complaint' ? 'bg-red-50 border-red-300 text-red-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
              <ThumbsDown size={14} /> Concern
            </button>
          </div>

          {kind === 'commendation' && (
            <div>
              <label className="text-xs text-ink-600 font-medium mb-1 block">Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)}
                    className={`text-2xl ${n <= rating ? 'text-amber-500' : 'text-ink-300'}`}>★</button>
                ))}
              </div>
            </div>
          )}

          <label className="block text-xs text-ink-600 font-medium">Title (optional)
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'commendation' ? 'e.g. Helpful with resident lockout' : 'e.g. Late arrival on Saturday'} />
          </label>

          <label className="block text-xs text-ink-600 font-medium">What happened?
            <textarea className="input mt-1" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} />
          </label>

          {err && <div className="text-sm text-red-700 inline-flex items-center gap-2"><AlertCircle size={14} /> {err}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Submit</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
