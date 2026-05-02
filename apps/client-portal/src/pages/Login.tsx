import { useState, type FormEvent } from 'react';
import { Shield } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Stigg Client Portal</h1>
            <p className="text-sm text-slate-500">Welcome back.</p>
          </div>
        </div>
        {!supabaseConfigured && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Portal is not configured. Speak to your account manager at Stigg.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button className="btn-primary w-full" type="submit" disabled={busy || !supabaseConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
