#!/usr/bin/env tsx
/**
 * Migrate from Trackforce / Silvertrac / TrackTik / spreadsheet exports.
 *
 * Usage:
 *   tsx scripts/import-csv.ts --kind=guards    --file=./data/guards.csv    --org=<org_uuid>
 *   tsx scripts/import-csv.ts --kind=sites     --file=./data/sites.csv     --org=<org_uuid>
 *   tsx scripts/import-csv.ts --kind=clients   --file=./data/clients.csv   --org=<org_uuid>
 *   tsx scripts/import-csv.ts --kind=incidents --file=./data/incidents.csv --org=<org_uuid>
 *
 * Column maps below are forgiving — they accept the most common header
 * variants from the three named systems. Rows that fail validation are
 * written to <file>.errors.csv with the failure reason; the rest are inserted.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true];
}));

const KINDS = ['guards', 'sites', 'clients', 'incidents'] as const;
type Kind = typeof KINDS[number];

const kind = args.kind as Kind;
const file = args.file as string;
const orgId = args.org as string;

if (!KINDS.includes(kind) || !file || !orgId) {
  console.error('usage: tsx scripts/import-csv.ts --kind=<guards|sites|clients|incidents> --file=<path> --org=<org_uuid>');
  process.exit(2);
}

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(2);
}

const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ── Header normalization ────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  // guards
  first_name: ['first_name', 'firstname', 'first', 'given'],
  last_name:  ['last_name', 'lastname', 'last', 'surname', 'family'],
  email:      ['email', 'email_address', 'email_addr'],
  phone:      ['phone', 'mobile', 'cell', 'phone_number'],
  hourly_rate:['hourly_rate', 'pay_rate', 'wage', 'hourly'],
  ssia_license_number: ['ssia_license_number', 'license_number', 'license_no', 'license', 'ssia'],
  ssia_license_expiry: ['ssia_license_expiry', 'license_expiry', 'license_exp', 'license_expiration', 'expiry'],
  first_aid_expiry:    ['first_aid_expiry', 'firstaid_expiry', 'first_aid_exp'],
  status:     ['status', 'state', 'employment_status'],
  // sites / clients shared
  name:       ['name', 'site_name', 'site', 'client_name', 'company', 'company_name'],
  city:       ['city', 'town'],
  region:     ['region', 'province', 'state'],
  postal_code:['postal_code', 'postal', 'zip', 'postcode'],
  site_type:  ['site_type', 'type', 'category'],
  remote:     ['remote', 'is_remote'],
  industry:   ['industry', 'vertical'],
  client_id:  ['client_id', 'client', 'account_id'],
  // incidents
  title:      ['title', 'summary', 'subject'],
  description:['description', 'details', 'narrative', 'narration', 'notes'],
  category:   ['category', 'type', 'incident_type'],
  severity:   ['severity', 'priority'],
  occurred_at:['occurred_at', 'occurred', 'when', 'incident_time', 'datetime', 'date_time'],
  site_name:  ['site_name', 'site', 'location'],
};

function normalize(headers: string[]): Record<string, number> {
  const lower = headers.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const map: Record<string, number> = {};
  for (const [canon, alts] of Object.entries(ALIASES)) {
    for (const a of alts) {
      const idx = lower.indexOf(a);
      if (idx >= 0) { map[canon] = idx; break; }
    }
  }
  return map;
}

// ── CSV parser (RFC 4180-ish, handles quoted commas, escaped quotes) ────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cell += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* skip */ }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

const SEVERITY = new Set(['low','medium','high','critical']);
const CATEGORY = new Set(['trespass','vandalism','theft','disturbance','medical','fire','maintenance','suspicious_activity','vehicle','cyber','transport','other']);

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

function parseDateOnly(s: string | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const text = readFileSync(file, 'utf8');
  const rows = parseCsv(text);
  const [headers, ...data] = rows;
  if (!headers) { console.error('empty file'); process.exit(1); }
  const cols = normalize(headers);
  const get = (r: string[], k: string): string | undefined => cols[k] != null ? r[cols[k]]?.trim() : undefined;

  const errors: Array<{ row: number; reason: string; line: string }> = [];
  let inserted = 0;

  if (kind === 'guards') {
    for (let i = 0; i < data.length; i++) {
      const r = data[i]!;
      const first = get(r, 'first_name');
      const last  = get(r, 'last_name');
      if (!first || !last) { errors.push({ row: i + 2, reason: 'missing first/last name', line: r.join(',') }); continue; }
      const payload: any = {
        org_id: orgId,
        first_name: first, last_name: last,
        email: get(r, 'email') || null,
        phone: get(r, 'phone') || null,
        hourly_rate: get(r, 'hourly_rate') ? parseFloat(get(r, 'hourly_rate')!) : null,
        ssia_license_number: get(r, 'ssia_license_number') || null,
        ssia_license_expiry: parseDateOnly(get(r, 'ssia_license_expiry')),
        first_aid_expiry: parseDateOnly(get(r, 'first_aid_expiry')),
        status: (get(r, 'status') || 'active').toLowerCase(),
      };
      const { error } = await sb.from('guards').insert(payload);
      if (error) errors.push({ row: i + 2, reason: error.message, line: r.join(',') });
      else inserted++;
    }
  } else if (kind === 'clients') {
    for (let i = 0; i < data.length; i++) {
      const r = data[i]!;
      const name = get(r, 'name');
      if (!name) { errors.push({ row: i + 2, reason: 'missing client name', line: r.join(',') }); continue; }
      const { error } = await sb.from('clients').insert({
        org_id: orgId, name,
        industry: get(r, 'industry') || null,
        status: 'active',
      });
      if (error) errors.push({ row: i + 2, reason: error.message, line: r.join(',') });
      else inserted++;
    }
  } else if (kind === 'sites') {
    // Site requires client_id — accept either a UUID or a client name we resolve.
    const { data: clients } = await sb.from('clients').select('id, name').eq('org_id', orgId);
    const byName = new Map<string, string>((clients ?? []).map((c: any) => [String(c.name).toLowerCase(), c.id]));
    for (let i = 0; i < data.length; i++) {
      const r = data[i]!;
      const name = get(r, 'name');
      const cidRaw = get(r, 'client_id') ?? '';
      const clientId = byName.get(cidRaw.toLowerCase()) ?? cidRaw;
      if (!name || !clientId) { errors.push({ row: i + 2, reason: 'missing site name or client_id', line: r.join(',') }); continue; }
      const { error } = await sb.from('sites').insert({
        org_id: orgId, client_id: clientId, name,
        city: get(r, 'city') || null,
        region: (get(r, 'region') || 'AB').toUpperCase(),
        postal_code: get(r, 'postal_code') || null,
        site_type: (get(r, 'site_type') || 'commercial').toLowerCase(),
        remote: ['1','true','yes','y'].includes(String(get(r, 'remote') ?? '').toLowerCase()),
      });
      if (error) errors.push({ row: i + 2, reason: error.message, line: r.join(',') });
      else inserted++;
    }
  } else if (kind === 'incidents') {
    const { data: sites } = await sb.from('sites').select('id, name').eq('org_id', orgId);
    const byName = new Map<string, string>((sites ?? []).map((s: any) => [String(s.name).toLowerCase(), s.id]));
    for (let i = 0; i < data.length; i++) {
      const r = data[i]!;
      const title = get(r, 'title') ?? get(r, 'description')?.slice(0, 80);
      const siteName = get(r, 'site_name')?.toLowerCase() ?? '';
      const siteId = byName.get(siteName);
      if (!title || !siteId) { errors.push({ row: i + 2, reason: 'missing title or unknown site', line: r.join(',') }); continue; }
      const sev = (get(r, 'severity') || 'low').toLowerCase();
      const cat = (get(r, 'category') || 'other').toLowerCase().replace(/\s+/g, '_');
      const { error } = await sb.from('incidents').insert({
        org_id: orgId, site_id: siteId,
        title,
        description: get(r, 'description') || null,
        category: CATEGORY.has(cat) ? cat : 'other',
        severity: SEVERITY.has(sev) ? sev : 'low',
        status: 'closed',
        occurred_at: parseDate(get(r, 'occurred_at')) ?? new Date().toISOString(),
      });
      if (error) errors.push({ row: i + 2, reason: error.message, line: r.join(',') });
      else inserted++;
    }
  }

  if (errors.length > 0) {
    const errFile = file.replace(/\.csv$/i, '') + '.errors.csv';
    writeFileSync(errFile, ['row,reason,line', ...errors.map((e) => `${e.row},"${e.reason.replace(/"/g, '""')}","${e.line.replace(/"/g, '""')}"`)].join('\n'));
    console.log(`Wrote ${errors.length} error rows to ${errFile}`);
  }
  console.log(`Imported ${inserted} of ${data.length} rows into ${kind}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
