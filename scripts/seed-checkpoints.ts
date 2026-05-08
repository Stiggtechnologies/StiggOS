#!/usr/bin/env tsx
/**
 * Seed checkpoints for an existing tour route, generating tag URLs ready to
 * write to NFC tags or print as QR codes.
 *
 * Idempotent — re-running with the same `--prefix` / ordinals updates labels,
 * geo, and radius without creating duplicates. Existing scans stay attached.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run seed:checkpoints -- \
 *       --route=<route_uuid> \
 *       --prefix=NW \
 *       --start=1001 \
 *       --base-url=https://app.stigg.ca \
 *       --csv=path/to/checkpoints.csv
 *
 *   The CSV columns are:    ordinal,label,lat,lng,radius_m
 *   `ordinal` is optional   (auto-numbered from 1 if absent)
 *   `radius_m` is optional  (defaults to 100m)
 *
 * Output: a tab-separated table to stdout you can paste into NXP TagWriter or
 * a QR code batch generator. Columns:  code  url  label  ordinal
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true];
}));

const routeId  = args.route as string;
const prefix   = (args.prefix as string) ?? '';
const startN   = parseInt((args.start as string) ?? '1001', 10);
const baseUrl  = ((args['base-url'] as string) ?? 'https://app.stigg.ca').replace(/\/$/, '');
const csvPath  = args.csv as string;
const dryRun   = !!args['dry-run'];

if (!routeId || !prefix || !csvPath) {
  console.error([
    'usage: tsx scripts/seed-checkpoints.ts \\',
    '  --route=<route_uuid> --prefix=<NW> [--start=1001] \\',
    '  [--base-url=https://app.stigg.ca] --csv=path/to/checkpoints.csv [--dry-run]',
  ].join('\n'));
  process.exit(2);
}

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required'); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });

interface CsvRow { ordinal?: number; label: string; lat: number; lng: number; radius_m?: number }

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const header = lines.shift()!.split(',').map((s) => s.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const iOrd = idx('ordinal'), iLab = idx('label'), iLat = idx('lat'), iLng = idx('lng'), iRad = idx('radius_m');
  if (iLab < 0 || iLat < 0 || iLng < 0) {
    throw new Error('CSV must include columns: label, lat, lng (ordinal & radius_m optional)');
  }
  return lines.map((line) => {
    const cols = line.split(',').map((s) => s.trim());
    return {
      ordinal:  iOrd >= 0 && cols[iOrd] ? parseInt(cols[iOrd], 10) : undefined,
      label:    cols[iLab],
      lat:      parseFloat(cols[iLat]),
      lng:      parseFloat(cols[iLng]),
      radius_m: iRad >= 0 && cols[iRad] ? parseInt(cols[iRad], 10) : undefined,
    };
  });
}

async function main() {
  // Resolve org from the route — we need org_id on the insert.
  const { data: route, error: re } = await sb.from('tour_routes')
    .select('id, org_id, site_id, name').eq('id', routeId).single();
  if (re || !route) { console.error(`Route ${routeId} not found:`, re?.message); process.exit(1); }

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const out: Array<{ code: string; url: string; label: string; ordinal: number }> = [];

  console.error(`→ ${dryRun ? '[dry-run] ' : ''}seeding ${rows.length} checkpoints into route "${route.name}"`);

  let n = startN;
  let auto = 1;
  for (const row of rows) {
    const ordinal = row.ordinal ?? auto++;
    const code    = `${prefix}-${n++}`;
    const radius  = row.radius_m ?? 100;
    const tagUrl  = `${baseUrl}/p/${encodeURIComponent(code)}`;
    out.push({ code, url: tagUrl, label: row.label, ordinal });

    if (dryRun) continue;

    // Upsert by (route_id, ordinal). The unique constraint on
    // (org_id, checkpoint_code) prevents collisions across routes.
    const { error: ue } = await sb.from('tour_checkpoints').upsert({
      org_id:           route.org_id,
      route_id:         route.id,
      ordinal,
      label:            row.label,
      scan_method:      'nfc',
      scan_token:       null,                 // not used by the NFC RPC; code is the identifier
      checkpoint_code:  code,
      allowed_radius_m: radius,
      is_active:        true,
      geo:              `POINT(${row.lng} ${row.lat})`,
    }, { onConflict: 'org_id,checkpoint_code' });
    if (ue) { console.error(`  failed ${code}: ${ue.message}`); process.exit(1); }
    console.error(`  ✓ ${code.padEnd(10)} ${row.label}`);
  }

  // Print the tag-programming table to stdout.
  console.log(['code', 'url', 'label', 'ordinal'].join('\t'));
  for (const r of out) console.log([r.code, r.url, r.label, r.ordinal].join('\t'));
}

main().catch((e) => { console.error(e); process.exit(1); });
