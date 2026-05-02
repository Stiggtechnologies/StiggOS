// Approved customer-facing copy. Appears once at the top of the dashboard.
// Source of truth: docs/MARKETING-COPY.md.

import { Shield } from 'lucide-react';

export function WelcomeBanner() {
  return (
    <aside className="card border-blue-200 bg-blue-50 text-slate-700">
      <div className="flex items-start gap-3">
        <Shield className="text-blue-600 shrink-0" size={18} />
        <p className="text-sm leading-relaxed">
          Stigg Security uses mobile patrol verification with GPS-stamped checkpoint scans, time-stamped reports, photos, and incident documentation reviewed by a supervisor. Company-issued patrol kits and key sets may also be equipped with asset trackers to reduce lost-key risk and support service accountability.
        </p>
      </div>
    </aside>
  );
}
