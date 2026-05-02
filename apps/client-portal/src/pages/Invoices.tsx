import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { ExternalLink } from 'lucide-react';

interface Invoice {
  id: string; invoice_number: string;
  period_start: string; period_end: string;
  total_cad: number; status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  due_date: string | null; pdf_url: string | null;
}

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal not configured.'); setLoading(false); return; }
    supabase.from('invoices').select('id, invoice_number, period_start, period_end, total_cad, status, due_date, pdf_url')
      .order('period_end', { ascending: false }).then(({ data, error }) => {
      if (error) setError(error.message);
      setRows((data ?? []) as Invoice[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-slate-500 mt-1">Statements for service delivered, with Alberta GST applied.</p>
      </header>
      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}
      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Period</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Total</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No invoices yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono">{r.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-600">{r.period_start} → {r.period_end}</td>
                  <td className="px-4 py-3 font-medium">{CAD.format(r.total_cad)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      r.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      r.status === 'sent'    ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.pdf_url ? <a href={r.pdf_url} className="text-blue-600 inline-flex items-center gap-1 text-xs"><ExternalLink size={12} /> open</a> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
