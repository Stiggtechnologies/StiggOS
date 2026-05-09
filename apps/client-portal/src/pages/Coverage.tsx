// Coverage — read-only map of the customer's sites + guards on duty.
// Lazy-loaded so the dashboard isn't held back by the MapLibre bundle.

import { lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';

const CoverageMap = lazy(() => import('../components/CoverageMap').then((m) => ({ default: m.CoverageMap })));

export function Coverage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><MapPin size={20} className="text-stigg-600" /> Coverage map</h1>
        <p className="page-subtitle">Every site under your asset-protection program, with any guards currently on patrol shown live.</p>
      </div>
      <Suspense fallback={<div className="card text-sm text-ink-500">Loading map…</div>}>
        <CoverageMap />
      </Suspense>
    </div>
  );
}
