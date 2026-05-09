// Read-only MapLibre map for the client portal. Shows the customer's own
// sites + geofences, plus any guards currently on duty and the last hour
// of patrol breadcrumbs per shift. RLS scopes everything to the caller's
// client_id (sites + guard_track_points policies in 0013).
//
// When the RPCs return no sites we fall through to a sandbox mock so the
// QA client portal renders something useful for demos. The legend shows a
// "Demo data" badge so it's never mistaken for live data.

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ScanLine, RefreshCcw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STYLE_URL = (import.meta.env.VITE_MAP_STYLE_URL as string | undefined) || 'https://tiles.openfreemap.org/styles/dark';
const TRAIL_WINDOW_MS = 60 * 60 * 1000;

export function CoverageMap() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const fitDoneRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({ sites: 0, guards: 0, lastRefresh: '—', mock: false });

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: mapEl.current,
      style: STYLE_URL,
      center: [-114.0719, 51.0447],
      zoom: 10,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      m.addSource('sites',       { type: 'geojson', data: emptyFC() });
      m.addSource('geofences',   { type: 'geojson', data: emptyFC() });
      m.addSource('guards',      { type: 'geojson', data: emptyFC() });
      m.addSource('breadcrumbs', { type: 'geojson', data: emptyFC() });

      m.addLayer({
        id: 'geofences-fill', type: 'fill', source: 'geofences',
        paint: { 'fill-color': '#d61f2b', 'fill-opacity': 0.10 },
      });
      m.addLayer({
        id: 'geofences-line', type: 'line', source: 'geofences',
        paint: { 'line-color': '#d61f2b', 'line-width': 1.4, 'line-opacity': 0.55 },
      });
      m.addLayer({
        id: 'breadcrumbs-line', type: 'line', source: 'breadcrumbs',
        paint: { 'line-color': '#22d3ee', 'line-width': 2, 'line-opacity': 0.75 },
      });
      m.addLayer({
        id: 'sites-circle', type: 'circle', source: 'sites',
        paint: {
          'circle-radius': 8,
          'circle-color': '#d61f2b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0a0a',
        },
      });
      m.addLayer({
        id: 'sites-label', type: 'symbol', source: 'sites',
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
        paint:  { 'text-color': '#e5e7eb', 'text-halo-color': '#0a0a0a', 'text-halo-width': 1.4 },
      });
      m.addLayer({
        id: 'guards-circle', type: 'circle', source: 'guards',
        paint: {
          'circle-radius': 7,
          'circle-color': '#10b981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0a0a',
        },
      });

      m.on('click', 'sites-circle', (e) => {
        const f = e.features?.[0]; if (!f) return;
        new maplibregl.Popup({ offset: 12, closeButton: false, className: 'stigg-popup' })
          .setLngLat((f.geometry as any).coordinates)
          .setHTML(`<div class="popup-body"><strong>${escapeHtml(f.properties?.name ?? '')}</strong><br/><span class="popup-sub">${escapeHtml(f.properties?.city ?? '')}</span></div>`)
          .addTo(m);
      });
      m.on('click', 'guards-circle', (e) => {
        const f = e.features?.[0]; if (!f) return;
        new maplibregl.Popup({ offset: 12, closeButton: false, className: 'stigg-popup' })
          .setLngLat((f.geometry as any).coordinates)
          .setHTML(`<div class="popup-body"><strong>${escapeHtml(f.properties?.guard_name ?? 'Guard on duty')}</strong><br/><span class="popup-sub">at ${escapeHtml(f.properties?.site_name ?? '')}</span></div>`)
          .addTo(m);
      });
      m.on('mouseenter', 'sites-circle', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'sites-circle', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'guards-circle', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'guards-circle', () => { m.getCanvas().style.cursor = ''; });

      mapRef.current = m;
      setReady(true);
    });
    return () => { m.remove(); mapRef.current = null; setReady(false); };
  }, []);

  async function refresh() {
    const m = mapRef.current; if (!m) return;
    const since = new Date(Date.now() - TRAIL_WINDOW_MS).toISOString();
    const [sitesRes, guardsRes, trailsRes] = await Promise.all([
      supabase.rpc('client_site_geojson'),
      supabase.rpc('client_active_guard_positions'),
      supabase.from('guard_track_points')
        .select('shift_id, recorded_at, geo')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true }),
    ]);

    let siteFeats: GeoJSON.Feature[] = ((sitesRes.data ?? []) as any[]).filter((r) => r.geo).map((r) => ({
      type: 'Feature', geometry: r.geo,
      properties: { id: r.id, name: r.name, city: r.city, site_type: r.site_type },
    }));
    let fenceFeats: GeoJSON.Feature[] = ((sitesRes.data ?? []) as any[]).filter((r) => r.geofence).map((r) => ({
      type: 'Feature', geometry: r.geofence,
      properties: { id: r.id, name: r.name },
    }));
    let guardFeats: GeoJSON.Feature[] = ((guardsRes.data ?? []) as any[]).filter((r) => r.geo).map((r) => ({
      type: 'Feature', geometry: r.geo,
      properties: { guard_id: r.guard_id, guard_name: r.guard_name, site_name: r.site_name, recorded_at: r.recorded_at },
    }));
    const byShift = new Map<string, [number, number][]>();
    for (const p of (trailsRes.data ?? []) as any[]) {
      const c = p.geo?.coordinates;
      if (!c || !p.shift_id) continue;
      if (!byShift.has(p.shift_id)) byShift.set(p.shift_id, []);
      byShift.get(p.shift_id)!.push(c);
    }
    let trailFeats: GeoJSON.Feature[] = Array.from(byShift.entries())
      .filter(([, coords]) => coords.length >= 2)
      .map(([sid, coords]) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: coords },
        properties: { shift_id: sid },
      }));

    const isMock = siteFeats.length === 0;
    if (isMock) {
      const mock = mockCoverage();
      siteFeats = mock.sites;
      fenceFeats = mock.fences;
      guardFeats = mock.guards;
      trailFeats = mock.trails;
    }

    (m.getSource('sites')       as GeoJSONSource).setData({ type: 'FeatureCollection', features: siteFeats });
    (m.getSource('geofences')   as GeoJSONSource).setData({ type: 'FeatureCollection', features: fenceFeats });
    (m.getSource('guards')      as GeoJSONSource).setData({ type: 'FeatureCollection', features: guardFeats });
    (m.getSource('breadcrumbs') as GeoJSONSource).setData({ type: 'FeatureCollection', features: trailFeats });

    if (siteFeats.length > 0 && !fitDoneRef.current) {
      const bb = new maplibregl.LngLatBounds();
      for (const f of siteFeats) bb.extend((f.geometry as any).coordinates);
      m.fitBounds(bb, { padding: 60, maxZoom: 13, duration: 400 });
      fitDoneRef.current = true;
    }
    setStats({ sites: siteFeats.length, guards: guardFeats.length, lastRefresh: new Date().toLocaleTimeString(), mock: isMock });
  }

  useEffect(() => {
    if (!ready) return;
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [ready]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="relative">
        <div ref={mapEl} className="h-[600px] w-full" />
        <div className="absolute top-3 left-3 bg-ink-950/85 border border-white/[0.08] rounded-lg backdrop-blur-glass px-3 py-2 text-xs space-y-1 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 text-ink-200 font-medium">
            <ScanLine size={11} className="text-stigg-600" /> Coverage
            {stats.mock && (
              <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-stigg-500/15 text-stigg-600 border border-stigg-500/30">
                <Sparkles size={8} /> Demo
              </span>
            )}
          </div>
          <div className="text-ink-300"><strong className="text-white">{stats.sites}</strong> site{stats.sites === 1 ? '' : 's'} · <strong className="text-emerald-400">{stats.guards}</strong> on duty now</div>
          <div className="flex items-center gap-3 text-[10px] text-ink-500">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-stigg-600" /> site</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> guard</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-cyan-400" /> patrol trail</span>
          </div>
          <button onClick={refresh} className="text-[11px] text-stigg-600 hover:text-stigg-500 inline-flex items-center gap-1 transition-colors">
            <RefreshCcw size={10} /> refreshed {stats.lastRefresh}
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyFC(): GeoJSON.FeatureCollection { return { type: 'FeatureCollection', features: [] }; }
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}

// ────────────────────────────────────────────────────────────────────
// Sandbox mock — 4 sites in/around Calgary, 2 with geofences and active
// guards on patrol with the last hour of breadcrumbs traced around the
// fence. Shaped exactly like the real RPC output so swapping in real
// data is invisible to the rest of the component.
// ────────────────────────────────────────────────────────────────────
function mockCoverage() {
  const SITES = [
    { id: 'm-1', name: 'QA · Riverside Tower',     city: 'Calgary',    coord: [-114.0780, 51.0490] as [number, number], hasFence: true,  hasGuard: true,  guard: 'M. Okafor' },
    { id: 'm-2', name: 'QA · Park Plaza Industrial', city: 'Calgary',  coord: [-114.0610, 51.0380] as [number, number], hasFence: true,  hasGuard: true,  guard: 'J. Singh' },
    { id: 'm-3', name: 'QA · Glen Park Storage',    city: 'Calgary',   coord: [-114.0920, 51.0560] as [number, number], hasFence: false, hasGuard: false, guard: '' },
    { id: 'm-4', name: 'QA · Westridge Logistics',  city: 'Cochrane',  coord: [-114.1380, 51.0820] as [number, number], hasFence: false, hasGuard: false, guard: '' },
  ];

  const sites: GeoJSON.Feature[] = SITES.map((s) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: s.coord },
    properties: { id: s.id, name: s.name, city: s.city, site_type: 'mock' },
  }));

  const fences: GeoJSON.Feature[] = SITES.filter((s) => s.hasFence).map((s) => ({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [squareAround(s.coord, 0.0035)] },
    properties: { id: s.id, name: s.name },
  }));

  const guards: GeoJSON.Feature[] = SITES.filter((s) => s.hasGuard).map((s, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: offsetCoord(s.coord, 0.0012, i) },
    properties: { guard_id: `mg-${i}`, guard_name: s.guard, site_name: s.name, recorded_at: new Date().toISOString() },
  }));

  const trails: GeoJSON.Feature[] = SITES.filter((s) => s.hasGuard).map((s, i) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: patrolLoop(s.coord, 0.0028, i) },
    properties: { shift_id: `ms-${i}` },
  }));

  return { sites, fences, guards, trails };
}

function squareAround([lng, lat]: [number, number], r: number): [number, number][] {
  return [
    [lng - r, lat - r],
    [lng + r, lat - r],
    [lng + r, lat + r],
    [lng - r, lat + r],
    [lng - r, lat - r],
  ];
}

// Walk-around-the-property style trail: 12 points on a slightly noisy loop.
function patrolLoop([lng, lat]: [number, number], r: number, seed: number): [number, number][] {
  const N = 12;
  const out: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const jitter = (Math.sin(seed * 7 + i * 1.7) * 0.15 + 1) * r;
    out.push([lng + Math.cos(t) * jitter, lat + Math.sin(t) * jitter * 0.7]);
  }
  return out;
}

function offsetCoord([lng, lat]: [number, number], r: number, seed: number): [number, number] {
  return [lng + Math.cos(seed * 1.7) * r, lat + Math.sin(seed * 1.7) * r];
}
