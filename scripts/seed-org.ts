#!/usr/bin/env tsx
/**
 * Bootstrap a new org and its first admin user.
 *
 *   tsx scripts/seed-org.ts \
 *     --slug=stigg --name="Stigg Security" \
 *     --admin-email=admin@stigg.example --admin-password=<temp>
 *
 * Idempotent: if the org slug exists, just creates the admin user (or
 * updates them) and links them. Run again whenever you need to add admins.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true];
}));

const slug = args.slug as string;
const name = (args.name as string) ?? slug;
const email = args['admin-email'] as string;
const password = args['admin-password'] as string;
const region = (args.region as string) ?? 'AB';
const tz = (args.tz as string) ?? 'America/Edmonton';

if (!slug || !email || !password) {
  console.error('usage: tsx scripts/seed-org.ts --slug=<slug> --admin-email=<email> --admin-password=<password> [--name=<name>] [--region=AB] [--tz=America/Edmonton]');
  process.exit(2);
}

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(2);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // Org (upsert on slug).
  let { data: org } = await sb.from('orgs').select('id, name').eq('slug', slug).maybeSingle();
  if (!org) {
    const { data, error } = await sb.from('orgs').insert({
      name, slug, region, timezone: tz,
      service_lines: ['guarding','surveillance','virtual_guard','it_security','secure_transport'],
    }).select('id, name').single();
    if (error) { console.error(error); process.exit(1); }
    org = data;
    console.log(`✓ created org ${org.id} (${slug})`);
  } else {
    console.log(`↺ org ${org.id} (${slug}) already exists`);
  }

  // Auth user (admin API).
  let userId: string | null = null;
  const { data: existing } = await sb.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    userId = found.id;
    await sb.auth.admin.updateUserById(found.id, { password });
    console.log(`↺ auth user ${found.id} password updated`);
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) { console.error(error); process.exit(1); }
    userId = data.user.id;
    console.log(`✓ created auth user ${userId}`);
  }

  // user_profiles row (insert or update).
  const { data: profile } = await sb.from('user_profiles').select('id, role').eq('auth_user_id', userId!).maybeSingle();
  if (profile) {
    await sb.from('user_profiles').update({ role: 'owner', is_active: true, org_id: org!.id }).eq('id', profile.id);
    console.log(`↺ profile ${profile.id} updated to owner of ${org!.id}`);
  } else {
    const { error } = await sb.from('user_profiles').insert({
      auth_user_id: userId, org_id: org!.id, email, full_name: email.split('@')[0], role: 'owner',
    });
    if (error) { console.error(error); process.exit(1); }
    console.log(`✓ profile linked: ${email} → owner of ${org!.name}`);
  }

  console.log('\nDone. Sign in at the console with:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
