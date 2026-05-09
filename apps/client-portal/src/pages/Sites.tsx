// Customer-facing site list. Click a card → rich PropertyProfile (no
// access credentials shown, RLS would block them anyway).

import { useEffect, useState } from 'react';
import { Building2, MapPin, ChevronRight, Navigation } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { OpenInMaps, PropertyProfile, type SiteProfile } from '@stigg/ui';

interface SiteRow extends SiteProfile {
  is_active: boolean;
  service_lines: string[];
}

export function Sites() {
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [geoMap, setGeoMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal not configured.'); setLoading(false); return; }
    (async () => {
      const [list, geo] = await Promise.all([
        supabase.from('sites').select('*').order('name'),
        supabase.rpc('client_site_geojson'),
      ]);
      if (list.error) setError(list.error.message);
      setRows((list.data ?? []) as SiteRow[]);
      const m: Record<string, any> = {};
      for (const r of (geo.data ?? []) as any[]) m[r.id] = r.geo;
      setGeoMap(m);
      setLoading(false);
    })();
  }, []);

  if (openId) {
    const site = rows.find((r) => r.id === openId);
    if (!site) { setOpenId(null); return null; }
    return (
      <PropertyProfile
        site={{ ...site, geo: geoMap[site.id] ?? null }}
        header={
          <button onClick={() => setOpenId(null)} className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" /> All sites
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My sites</h1>
        <p className="page-subtitle">Properties under your asset-protection program. Tap any card for the full profile and one-click navigation.</p>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading && <div className="text-sm text-ink-500">Loading…</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((s) => {
          const lat = geoMap[s.id]?.coordinates?.[1];
          const lon = geoMap[s.id]?.coordinates?.[0];
          const addr = [s.street_address, s.city, s.region].filter(Boolean).join(', ');
          return (
            <article key={s.id} className="card hover:border-stigg-300 transition-colors flex flex-col gap-3">
              <button onClick={() => setOpenId(s.id)} className="text-left">
                <h3 className="font-semibold flex items-center gap-2 text-ink-900">
                  <Building2 size={14} className="text-stigg-600" /> {s.name}
                </h3>
                {addr && <p className="text-xs text-ink-600 mt-1 flex items-center gap-1"><MapPin size={11} /> {addr}</p>}
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  {s.units_count != null && <Fact label="Suites" value={s.units_count} />}
                  {s.buildings_count != null && <Fact label="Buildings" value={s.buildings_count} />}
                  {s.year_built != null && <Fact label="Built" value={s.year_built} />}
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-ink-100">
                <button onClick={() => setOpenId(s.id)} className="text-xs text-stigg-600 hover:underline inline-flex items-center gap-1">
                  Open profile <ChevronRight size={11} />
                </button>
                <OpenInMaps lat={lat ?? null} lon={lon ?? null} label={s.name} address={addr} size="sm" />
              </div>
            </article>
          );
        })}
        {!loading && rows.length === 0 && <p className="text-ink-500 text-sm col-span-full">No sites yet.</p>}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-50 rounded-lg px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="text-sm font-semibold text-ink-900 tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
