// Display helpers used across CRUD pages.

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('en-CA');

export const fmtCAD = (n: number | null | undefined) => (n == null ? '—' : CAD.format(n));
export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : NUM.format(n));

export const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-CA'); } catch { return s; }
};
export const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-CA'); } catch { return s; }
};

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export function expiryClass(d: number | null): string {
  if (d == null) return 'text-slate-500';
  if (d < 0) return 'text-red-400 font-semibold';
  if (d <= 14) return 'text-red-300';
  if (d <= 30) return 'text-amber-400';
  return 'text-slate-300';
}

export function expiryLabel(iso: string | null | undefined): string {
  const d = daysUntil(iso);
  if (d == null) return '—';
  if (d < 0) return `expired ${-d}d ago`;
  if (d === 0) return 'expires today';
  return `${d}d`;
}

export function severityBadge(sev: string): string {
  return sev === 'critical' ? 'badge-critical'
       : sev === 'high'     ? 'badge-high'
       : sev === 'medium'   ? 'badge-medium'
       : 'badge-low';
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'active': case 'completed': case 'paid': case 'resolved': case 'won':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'investigating': case 'in_progress': case 'qualified': case 'sent': case 'overdue':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'cancelled': case 'terminated': case 'lost': case 'churned': case 'void':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
  }
}
