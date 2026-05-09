// Display helpers shared across portal pages.

export const CAD = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

export const CADf = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export const NUM = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat('en-CA').format(n);

export function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (ms < 0) return 'soon';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
}

export const ucfirst = (s: string | null | undefined): string =>
  !s ? '—' : s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
