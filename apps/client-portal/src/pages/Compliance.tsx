// Compliance Pack — every cert / license / OHS doc the customer needs at
// audit / renewal / insurance-review time. Signed-URL downloads, no
// emailing-Stigg-for-our-COI nonsense.

import { useEffect, useState } from 'react';
import { ShieldCheck, Download, Calendar, FileBadge, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ucfirst } from '../lib/format';

interface Doc {
  id: string; category: string; title: string; description: string | null;
  file_path: string; bucket: string;
  effective_from: string | null; expires_on: string | null;
  size_bytes: number | null; created_at: string;
}

const CATEGORY_ORDER = [
  'insurance_certificate','ssia_license','wcb_clearance',
  'ohs_program','privacy_policy','service_agreement_template',
  'capability_brief','pricing_sheet','other',
];

export function Compliance() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('portal_documents')
        .select('id, category, title, description, file_path, bucket, effective_from, expires_on, size_bytes, created_at')
        .eq('is_active', true).order('category').order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setDocs((data ?? []) as Doc[]);
      setLoading(false);
    })();
  }, []);

  async function download(d: Doc) {
    setDownloading(d.id); setError(null);
    try {
      const { data, error } = await supabase.storage.from(d.bucket).createSignedUrl(d.file_path, 600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(null);
    }
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((m, d) => { (m[d.category] ??= []).push(d); return m; }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><ShieldCheck size={20} className="text-stigg-600" /> Compliance pack</h1>
        <p className="page-subtitle">Insurance certificates, AB Justice license, OHS docs — everything your auditor or insurer asks for.</p>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      {loading
        ? <div className="text-sm text-ink-500">Loading…</div>
        : docs.length === 0
          ? <div className="card text-sm text-ink-500">
              No documents have been published to your portal yet. Your account manager is uploading them — ask us if you need something specific in the meantime.
            </div>
          : <div className="space-y-6">
              {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((c) => (
                <div key={c}>
                  <h2 className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-semibold mb-2">{ucfirst(c)}</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {grouped[c]!.map((d) => <DocCard key={d.id} doc={d} downloading={downloading === d.id} onDownload={() => download(d)} />)}
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}

function DocCard({ doc, downloading, onDownload }: { doc: Doc; downloading: boolean; onDownload: () => void }) {
  const expiringSoon = doc.expires_on ? Math.ceil((Date.parse(doc.expires_on) - Date.now()) / 86_400_000) <= 30 : false;
  const expired      = doc.expires_on ? Date.parse(doc.expires_on) < Date.now() : false;
  return (
    <div className="card flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-stigg-50 grid place-items-center text-stigg-600 shrink-0"><FileBadge size={18} /></div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-900">{doc.title}</div>
        {doc.description && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{doc.description}</p>}
        <div className="text-[11px] text-ink-500 mt-2 flex items-center gap-2 flex-wrap">
          {doc.effective_from && <span className="inline-flex items-center gap-1"><Calendar size={10} /> from {doc.effective_from}</span>}
          {doc.expires_on && (
            expired       ? <span className="chip-crit">expired {doc.expires_on}</span> :
            expiringSoon  ? <span className="chip-warn">expires {doc.expires_on}</span> :
                            <span className="text-ink-500">expires {doc.expires_on}</span>
          )}
          {doc.size_bytes && <span>· {(doc.size_bytes / 1024).toFixed(0)} KB</span>}
        </div>
      </div>
      <button className="btn-sm-ghost shrink-0" onClick={onDownload} disabled={downloading}>
        {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
      </button>
    </div>
  );
}
