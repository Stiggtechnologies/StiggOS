// Public application page at /apply/:slug — no auth required.
// Customers and prospective guards both reach the portal at portal.stigg.ca,
// so we share the React Router. Anonymous Supabase access (anon key) reads
// the published posting; submission posts to the careers-apply edge fn.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, Send, Loader2, CheckCircle2, AlertCircle, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Posting {
  id: string; slug: string; title: string; role_target: string;
  location_city: string | null; location_region: string | null;
  employment_type: string;
  pay_range_low: number | null; pay_range_high: number | null;
  description_md: string | null;
  required_skills: string[] | null; required_licenses: string[] | null;
  status: string; closes_on: string | null;
  referral_bonus_cad: number | null;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/careers-apply`;
const ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function Apply() {
  const { slug } = useParams();
  const [posting, setPosting] = useState<Posting | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState<{ message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('AB');
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [referrer, setReferrer] = useState('');
  const [source, setSource] = useState('careers_site');

  useEffect(() => {
    if (!slug) { setNotFound(true); return; }
    supabase.from('job_postings').select('id, slug, title, role_target, location_city, location_region, employment_type, pay_range_low, pay_range_high, description_md, required_skills, required_licenses, status, closes_on, referral_bonus_cad')
      .eq('slug', slug).eq('status', 'published').maybeSingle()
      .then(({ data }) => { if (!data) setNotFound(true); else setPosting(data as Posting); });
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!posting) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set('posting_slug', posting.slug);
      fd.set('first_name', first);
      fd.set('last_name', last);
      fd.set('email', email);
      fd.set('phone', phone);
      fd.set('city', city);
      fd.set('region', region);
      fd.set('cover_letter', coverLetter);
      fd.set('source', source);
      if (referrer) fd.set('referrer_name', referrer);
      if (resume) fd.set('resume', resume);

      const r = await fetch(FN_URL, { method: 'POST', body: fd, headers: { apikey: ANON } });
      const body = await r.json();
      if (!r.ok) { setErr(body.error ?? `${r.status}`); return; }
      setSubmitted({ message: body.ack_message });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50 p-6">
        <div className="card text-center max-w-md">
          <h1 className="page-title">Posting not found</h1>
          <p className="page-subtitle">This role may have been filled or removed. Visit <a className="text-stigg-600 hover:underline" href="/careers">our careers page</a> to see currently open positions.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50 p-6">
        <div className="card text-center max-w-md">
          <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
          <h1 className="page-title mt-3">Application received</h1>
          <p className="page-subtitle">{submitted.message}</p>
        </div>
      </div>
    );
  }

  if (!posting) return <div className="min-h-screen grid place-items-center bg-ink-50 text-ink-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white font-bold">S</div>
          <div>
            <div className="font-semibold text-ink-900">Stigg Security</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-semibold">Careers</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tightest text-ink-900">{posting.title}</h1>
          <div className="flex items-center gap-3 flex-wrap mt-2 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1"><MapPin size={12} />{posting.location_city ?? ''}{posting.location_region ? `, ${posting.location_region}` : ''}</span>
            <span className="inline-flex items-center gap-1"><Briefcase size={12} />{posting.employment_type.replace('_',' ')}</span>
            {posting.pay_range_low && posting.pay_range_high && (
              <span className="inline-flex items-center gap-1"><DollarSign size={12} />${posting.pay_range_low}–${posting.pay_range_high}/h</span>
            )}
          </div>
        </div>

        {posting.description_md && (
          <div className="card prose prose-sm max-w-none text-ink-700 whitespace-pre-wrap">{posting.description_md}</div>
        )}

        {(posting.required_skills?.length ?? 0) + (posting.required_licenses?.length ?? 0) > 0 && (
          <div className="card">
            <h3 className="font-semibold text-ink-900 mb-2">What we need from you</h3>
            {(posting.required_skills?.length ?? 0) > 0 && (
              <div className="mb-2"><div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1">Skills</div>
                <div className="flex flex-wrap gap-1.5">{(posting.required_skills ?? []).map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-stigg-50 text-stigg-700 border border-stigg-200">{s.replace(/_/g,' ')}</span>)}</div>
              </div>
            )}
            {(posting.required_licenses?.length ?? 0) > 0 && (
              <div><div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1">Licenses</div>
                <div className="flex flex-wrap gap-1.5">{(posting.required_licenses ?? []).map((l) => <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{l.replace(/_/g,' ')}</span>)}</div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-semibold text-ink-900">Apply now</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="First name *" value={first} onChange={setFirst} required />
            <Field label="Last name *" value={last} onChange={setLast} required />
            <Field label="Email *" type="email" value={email} onChange={setEmail} required />
            <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="Province / region" value={region} onChange={setRegion} />
          </div>
          <Field label="Cover letter (optional)" value={coverLetter} onChange={setCoverLetter} multiline />
          <label className="block text-xs text-ink-600 font-medium">
            Resume (PDF / DOC / DOCX, max 8 MB)
            <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.pages" onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              className="block w-full mt-1 text-xs text-ink-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stigg-600 file:text-white file:cursor-pointer hover:file:bg-stigg-700" />
            {resume && <div className="text-[11px] text-ink-500 mt-1">{resume.name} · {(resume.size / 1024).toFixed(0)} KB</div>}
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block text-xs text-ink-600 font-medium">How did you hear about us?
              <select value={source} onChange={(e) => setSource(e.target.value)} className="input mt-1">
                <option value="careers_site">Stigg careers site</option>
                <option value="indeed">Indeed</option>
                <option value="linkedin">LinkedIn</option>
                <option value="ziprecruiter">ZipRecruiter</option>
                <option value="referral">Referral</option>
                <option value="walk_in">Walk-in</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </select>
            </label>
            {source === 'referral' && <Field label="Referrer name" value={referrer} onChange={setReferrer} />}
          </div>

          {err && <div className="text-sm text-red-700 inline-flex items-center gap-2"><AlertCircle size={14} />{err}</div>}

          <p className="text-[11px] text-ink-500">By submitting, you consent to Stigg Security collecting and processing your application data for hiring purposes (PIPEDA-compliant). Data is retained 24 months unless you ask us to delete it.</p>

          <div className="flex justify-end pt-2 border-t border-ink-100">
            <button type="submit" disabled={busy || !first || !last || !email} className="btn-primary">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit application</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type='text', required=false, multiline=false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; multiline?: boolean }) {
  return (
    <label className="block text-xs text-ink-600 font-medium">{label}
      {multiline
        ? <textarea value={value} rows={4} onChange={(e) => onChange(e.target.value)} required={required} className="input mt-1" />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="input mt-1" />
      }
    </label>
  );
}
