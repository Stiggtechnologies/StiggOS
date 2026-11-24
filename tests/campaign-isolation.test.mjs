import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'

const modulePath = process.env.PGLITE_MODULE || '@electric-sql/pglite'
const {PGlite} = await import(modulePath)
const db = new PGlite()
const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const c = '00000000-0000-4000-8000-000000000003'
const wa = '10000000-0000-4000-8000-000000000001'
const wb = '10000000-0000-4000-8000-000000000002'

async function login(user) {
  await db.exec('reset role; set role authenticated;')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
}
test('two synthetic companies, fail-closed for outsiders and protected writes',async()=>{
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
        as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      insert into auth.users values ('${a}'),('${b}'),('${c}');
    `)
    await db.exec(await readFile(new URL('../supabase/staging/campaign_isolation_preflight.sql',import.meta.url),'utf8'))
    await db.exec(`
      insert into stigg_campaign.workspace values ('${wa}','Example A'),('${wb}','Example B');
      insert into stigg_campaign.membership values ('${wa}','${a}','operator'),('${wb}','${b}','reviewer');
      insert into stigg_campaign.contact_preview values
        ('${wa}','casey@example.com','customer'),('${wb}','lee@example.net','lead');
    `)
    await assert.rejects(db.query('insert into stigg_campaign.contact_preview values ($1,$2,$3)',[wa,'person@real-customer.ca','lead']))
    for (const [user, ws, label, email] of [[a,wa,'Example A','casey@example.com'],[b,wb,'Example B','lee@example.net']]) {
      await login(user)
      assert.deepEqual((await db.query('select label from stigg_campaign.workspace')).rows,[{label}])
      assert.deepEqual((await db.query('select email from stigg_campaign.contact_preview')).rows,[{email}])
      const other=ws===wa?wb:wa
      assert.deepEqual((await db.query('select email from stigg_campaign.contact_preview where workspace_id=$1',[other])).rows,[])
      await assert.rejects(db.query('insert into stigg_campaign.membership values ($1,$2,$3)',[other,user,'reviewer']), /permission denied/)
      await assert.rejects(db.query('insert into stigg_campaign.contact_preview values ($1,$2,$3)',[ws,'additional@example.com','lead']), /permission denied/)
    }
    await login(c)
    assert.deepEqual((await db.query('select * from stigg_campaign.contact_preview')).rows,[])
    await db.exec('reset role; set role anon;')
    await assert.rejects(db.query('select * from stigg_campaign.contact_preview'), /permission denied/)
  } finally {
    await db.close()
  }
})
