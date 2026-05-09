import { useState, type FormEvent } from 'react';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { Logo } from '@stigg/brand';
import { LiveNetworkCanvas } from '../components/LiveNetworkCanvas';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Hero — minimalist. Wordmark, one headline, animated canvas. Nothing else. */}
      <aside
        className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(180deg, #05060a 0%, #0a0c14 100%)' }}
      >
        <LiveNetworkCanvas className="absolute inset-0 w-full h-full pointer-events-none" />

        <div className="relative z-10">
          <Logo height={28} />
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl xl:text-6xl font-semibold tracking-tightest leading-[1.02] text-white">
            Your asset-protection<br />program.
          </h1>
          <p className="mt-6 text-ink-400 text-base xl:text-lg leading-relaxed max-w-md font-light">
            Security as protection of rent, occupancy, and asset condition — live across every site you operate.
          </p>
        </div>

        <div className="relative z-10 text-[11px] text-ink-500">
          © {new Date().getFullYear()} Stigg Security Inc.
        </div>
      </aside>

      {/* Sign-in form — clean white, fast to use */}
      <main className="flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden mb-8"><Logo height={28} tone="light" /></div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h2>
          <p className="text-ink-500 text-sm mt-1">Sign in to your Stigg portal.</p>

          {!supabaseConfigured && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Portal isn't configured. Contact your Stigg account manager.
            </div>
          )}
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs text-ink-500 uppercase tracking-wider">Email</span>
              <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-500 uppercase tracking-wider">Password</span>
              <div className="relative mt-1">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-ink-400 hover:text-ink-700 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            {err && <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <button className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2" type="submit" disabled={busy || !supabaseConfigured}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-400">
            <ShieldCheck size={12} className="text-emerald-500" /> PIPEDA compliant · scoped to your sites only
          </div>
        </div>
      </main>
    </div>
  );
}
