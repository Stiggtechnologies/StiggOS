export type Channel = 'email' | 'sms'
export type Stage = 'customer' | 'lead'
export type Basis = 'unverified' | 'documented-email-basis' | 'express'
export type Stop = 'reply' | 'booked' | 'opt_out' | 'bounce' | 'complaint'

export type PilotContact = {
  id: string
  account: string
  email: string
  stage: Stage
  emailBasis: Basis
  emailExpires: string
  smsOptIn: boolean
  evidence: string
}
export type Touch = { key: string; contactId: string; channel: Channel; step: number; due: string }
export type PilotState = { queued: Touch[]; stopped: Record<string, Stop> }

const emailPattern = /^[A-Z0-9._%+-]+@example\.(com|net|org)$/i
const isDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date

export const template = [
  'account,email,stage,email_basis,email_expires,sms_opt_in,evidence_reference',
  'Example Retail,casey@example.com,customer,documented-email-basis,2027-06-01,no,fixture-01',
  'Example Property,lee@example.net,customer,express,,yes,fixture-02',
  'Example Leads,blair@example.org,lead,unverified,,no,',
].join('\n')

// CSV parser supports spreadsheet-quoted fields and rejects malformed quoting.
function csv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false, closed = false
  const endField = () => { row.push(value.trim()); value = ''; closed = false }
  const endRow = () => { endField(); if (row.some(Boolean)) rows.push(row); row = [] }
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i+1] === '"') { value += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else value += c
    } else if (c === ',') endField()
    else if (c === '\n') endRow()
    else if (closed) throw new Error('Unexpected text after a quoted CSV field.')
    else if (c === '"' && value === '') quoted = true
    else if (c === '"') throw new Error('Unexpected quote in a CSV field.')
    else value += c
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.')
  endRow()
  return rows
}

export function importPreview(text: string, existing: PilotContact[] = []) {
  if (text.length > 100_000) throw new Error('Preview is limited to 100 KB.')
  const [header, ...rows] = csv(text)
  if (!header || header.join(',').toLowerCase() !== template.split('\n')[0])
    throw new Error('Use the exact header in the sample CSV.')
  if (rows.length > 500) throw new Error('Preview is limited to 500 rows.')
  const seen = new Set(existing.map(c => c.id))
  const accepted: PilotContact[] = []
  const issues: string[] = []
  let duplicates = 0
  rows.forEach((r, i) => {
    const [account, rawEmail, stage, basis, expires, sms, evidence] = r
    const email = rawEmail?.toLowerCase() ?? ''
    const check = (message: string) => issues.push(`Record ${i + 1}: ${message}`)
    if (r.length !== 7 || !account || account.length > 140 || !emailPattern.test(email))
      return void check('Use a short account name and an example.com, example.net or example.org email.')
    if (stage !== 'customer' && stage !== 'lead') return void check('Stage must be customer or lead.')
    if (basis !== 'unverified' && basis !== 'documented-email-basis' && basis !== 'express')
      return void check('Unknown email eligibility basis.')
    if ((expires && !isDate(expires)) || (basis === 'documented-email-basis' && !expires))
      return void check('Documented email basis requires a valid expiry date.')
    if (sms !== 'yes' && sms !== 'no') return void check('SMS opt-in must be yes or no.')
    if ((basis !== 'unverified' || sms === 'yes') && (!evidence || !/^fixture-[\w-]+$/.test(evidence)))
      return void check('Use a synthetic evidence reference starting with fixture-.')
    if (seen.has(email)) { duplicates++; return }
    seen.add(email)
    accepted.push({id:email,account,email,stage,emailBasis:basis,emailExpires:expires,smsOptIn:sms === 'yes',evidence})
  })
  return {accepted, duplicates, issues}
}

export function eligible(contact: PilotContact, channel: Channel, on: string) {
  if (!isDate(on) || !contact.evidence) return false
  if (channel === 'sms') return contact.smsOptIn
  return contact.emailBasis !== 'unverified' && (!contact.emailExpires || on < contact.emailExpires)
}

export function addBusinessDays(on: string, days: number): string {
  if (!isDate(on)) throw new Error('Select a valid start date.')
  const date = new Date(on + 'T00:00:00Z')
  const advance = () => date.setUTCDate(date.getUTCDate() + 1)
  const weekend = () => [0, 6].includes(date.getUTCDay())
  while (weekend()) advance()
  for (let done = 0; done < days;) { advance(); if (!weekend()) done++ }
  return date.toISOString().slice(0, 10)
}

export function approveDryRun(state: PilotState, contacts: PilotContact[], channel: Channel, start: string): PilotState {
  const enrolled = new Set(state.queued.map(t => t.contactId))
  const added: Touch[] = []
  for (const c of contacts) {
    if (Object.prototype.hasOwnProperty.call(state.stopped,c.id) || enrolled.has(c.id)) continue
    const days = channel === 'email' ? [0, 4, 11] : [0, 7]
    const plan = days.map((offset, step) => ({key:`${c.id}:${channel}:${step+1}`,contactId:c.id,channel,step:step+1,due:addBusinessDays(start,offset)}))
      .filter(t => eligible(c, channel, t.due))
    if (!plan.length || plan[0].step !== 1) continue
    added.push(...plan)
    enrolled.add(c.id)
  }
  return {...state, queued:[...state.queued,...added]}
}

export function stopFollowUps(state: PilotState, contactId: string, reason: Stop): PilotState {
  return {...state, stopped:{...state.stopped,[contactId]:reason}}
}

export function activeTouches(state: PilotState): Touch[] {
  return state.queued.filter(t => !Object.prototype.hasOwnProperty.call(state.stopped,t.contactId))
}
