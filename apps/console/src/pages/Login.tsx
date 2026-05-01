import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabaseConfigured } from '../lib/supabase';

export function Login() {
  const { signIn, session } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) { nav('/'); return null; }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error); else nav('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} className="text-blue-500" />
          <div>
            <h1 className="text-xl font-bold">Stigg OS</h1>
            <p className="text-sm text-slate-400">Sign in to continue</p>
          </div>
        </div>
        {!supabaseConfigured && (
          <div className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> and reload.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={busy || !supabaseConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
