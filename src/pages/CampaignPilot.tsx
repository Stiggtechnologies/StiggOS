import { useState } from 'react'
import { activeTouches, approveDryRun, importPreview, stopFollowUps, template } from '../lib/campaignPilot'
import type { Channel, PilotContact, PilotState, Stop } from '../lib/campaignPilot'
import { useAuth } from '../lib/AuthContext'

const reasons: Record<Stop,string> = {reply:'Reply',booked:'Booked',opt_out:'Opt-out',bounce:'Bounce',complaint:'Complaint'}
const initial: PilotState = {queued:[],stopped:{}}

function Sandbox() {
  const [source, setSource] = useState(template)
  const [contacts,setContacts] = useState<PilotContact[]>([])
  const [state,setState] = useState(initial)
  const [channel,setChannel] = useState<Channel>('email')
  const [date,setDate] = useState(new Date().toISOString().slice(0,10))
  const [note,setNote] = useState('')
  const [issues,setIssues] = useState<string[]>([])
  const [reviewed,setReviewed] = useState(false)
  const [stopId,setStopId] = useState('')
  const [reason,setReason] = useState<Stop>('reply')
  const active = activeTouches(state)
  const customers = contacts.filter(c=>c.stage==='customer').length
  const coverage = new Set(state.queued.map(t=>t.contactId)).size

  function read() {
    setReviewed(false)
    try {
      const result = importPreview(source,contacts)
      setContacts([...contacts,...result.accepted])
      setIssues(result.issues)
      setNote(`${result.accepted.length} accepted, ${result.duplicates} duplicate, ${result.issues.length} rejected.`)
    } catch (e) { setNote(e instanceof Error ? e.message : 'CSV could not be read.'); setIssues([]) }
  }

  function approve() {
    if (!reviewed) return
    try {
      const next = approveDryRun(state,contacts,channel,date)
      setState(next)
      setNote(`${next.queued.length-state.queued.length} simulated touches added; no messages sent.`)
      setReviewed(false)
    } catch (e) { setNote(e instanceof Error ? e.message : 'Preview failed.') }
  }

  const field = 'bg-primary border border-default rounded px-3 py-2 text-primary'
  const button = 'bg-secondary border border-default rounded px-3 py-2 hover:border-accent disabled:opacity-50'
  return (
    <section aria-label="Stigg Cyber campaign sandbox" className="space-y-4 bg-secondary rounded-lg border border-default p-4">
      <div>
        <h2 className="text-xl font-semibold">Stigg Cyber campaign sandbox</h2>
        <p className="text-sm text-secondary">Development only. Use synthetic data. Nothing is stored, uploaded or sent.</p>
      </div>
      <label className="block">Synthetic CSV
        <textarea className={`${field} block w-full mt-1 font-mono text-sm`} rows={6} value={source} onChange={e=>{setSource(e.target.value);setReviewed(false)}} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={read}>Check and import sample</button>
        <button type="button" className={button} onClick={()=>{setContacts([]);setState(initial);setSource(template);setReviewed(false);setStopId('');setIssues([]);setNote('Sandbox cleared.')}}>Reset sandbox</button>
      </div>
      <p role="status">{note}</p>
      {!!issues.length && <ul className="list-disc pl-6">{issues.slice(0,12).map(e=><li key={e}>{e}</li>)}{issues.length>12&&<li>{issues.length-12} more rejected records.</li>}</ul>}
      <p>{customers} customers · {contacts.length-customers} leads · {coverage} enrolled · {active.length} pending · {Object.keys(state.stopped).length} stopped</p>
      {contacts.length>0 && <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label>Channel <select className={field} value={channel} onChange={e=>{setChannel(e.target.value as Channel);setReviewed(false)}}><option value="email">Email</option><option value="sms">SMS</option></select></label>
          <label>Start date <input className={field} type="date" value={date} onChange={e=>{setDate(e.target.value);setReviewed(false)}} /></label>
          <label className="self-center"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} /> Confirm synthetic run</label>
          <button type="button" className={button} disabled={!reviewed} onClick={approve}>Approve dry run</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <label>Contact <select className={field} value={stopId} onChange={e=>setStopId(e.target.value)}><option value="">Select contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.email}</option>)}</select></label>
          <label>Stop reason <select className={field} value={reason} onChange={e=>setReason(e.target.value as Stop)}>{Object.entries(reasons).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <button type="button" className={button} disabled={!stopId} onClick={()=>{setState(s=>stopFollowUps(s,stopId,reason));setNote('Remaining touches stopped for this contact.')}}>Stop follow-ups</button>
        </div>
      </div>}
      {state.queued.length>0 && <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr>{['Contact','Channel','Touch','Due','Status'].map(h=><th className="px-2 py-1" key={h}>{h}</th>)}</tr></thead>
          <tbody>{state.queued.map(t=><tr className="border-t border-default" key={t.key}>
            <td className="px-2 py-1">{t.contactId}</td><td className="px-2 py-1">{t.channel}</td><td className="px-2 py-1">{t.step}</td><td className="px-2 py-1">{t.due}</td>
            <td className="px-2 py-1">{state.stopped[t.contactId] ? `Stopped: ${reasons[state.stopped[t.contactId]]}` : 'Simulated pending'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  )
}

export default function CampaignPilot() {
  const {profile} = useAuth()
  return <Sandbox key={profile?.org_id ?? 'synthetic'} />
}
