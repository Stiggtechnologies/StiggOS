import assert from 'node:assert/strict'
import test from 'node:test'
import {activeTouches,addBusinessDays,approveDryRun,importPreview,stopFollowUps,template} from '../src/lib/campaignPilot.ts'

const empty = {queued:[],stopped:{}}
const read = () => importPreview(template).accepted

test('quoted CSV and duplicate detection are case-insensitive', () => {
  const text = template + '\n"Example, Team",CASEY@example.com,customer,express,,no,fixture-03'
  const result = importPreview(text)
  assert.equal(result.accepted.length,3)
  assert.equal(result.duplicates,1)
  assert.equal(importPreview(template,result.accepted).duplicates,3)
})

test('reject real addresses and invalid or absent evidence', () => {
  const result = importPreview(template + '\nReal,person@actual-business.ca,customer,express,,yes,fixture-03\nMissing,none@example.com,customer,express,,no,')
  assert.equal(result.issues.length,2)
  assert.throws(()=>importPreview(template+'\n"unclosed'), /Unclosed/)
})

test('unverified and expired records stay out of the queue', () => {
  const result=approveDryRun(empty,read(),'email','2027-06-04')
  assert.equal(result.queued.length,3)
  assert.ok(result.queued.every(t=>t.contactId==='lee@example.net'))
})

test('separate SMS consent, no multi-channel or repeat enrollment', () => {
  const result=approveDryRun(empty,read(),'sms','2026-11-27')
  assert.equal(result.queued.length,2)
  assert.ok(result.queued.every(t=>t.contactId==='lee@example.net'))
  assert.deepEqual(approveDryRun(result,read(),'sms','2026-11-27'),result)
  const thenEmail=approveDryRun(result,read(),'email','2026-11-27')
  assert.equal(thenEmail.queued.filter(t=>t.contactId==='lee@example.net').length,2)
})

test('reply, booking, opt-out, bounce and complaint stop further touches', () => {
  const result=approveDryRun(empty,read(),'email','2026-11-27')
  for (const reason of ['reply','booked','opt_out','bounce','complaint']) {
    const stopped=stopFollowUps(result,'lee@example.net',reason)
    assert.equal(activeTouches(stopped).filter(t=>t.contactId==='lee@example.net').length,0)
    assert.equal(approveDryRun(stopped,read(),'email','2026-11-27').queued.length,result.queued.length)
  }
})

test('weekday date arithmetic and expiry at each touch', () => {
  assert.equal(addBusinessDays('2026-11-28',0),'2026-11-30')
  assert.equal(addBusinessDays('2026-11-27',4),'2026-12-03')
  const [c]=read(); c.emailExpires='2026-12-03'
  assert.deepEqual(approveDryRun(empty,[c],'email','2026-11-27').queued.map(t=>t.step),[1])
})
