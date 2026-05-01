import { Component, type ReactNode } from 'react';

interface S { error: Error | null }
interface P { children: ReactNode }

export class ErrorBoundary extends Component<P, S> {
  state: S = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: unknown) {
    // Sentry hook-in point. We want this to fire even if Sentry is missing.
    if ((window as any).Sentry?.captureException) {
      (window as any).Sentry.captureException(error, { extra: { info } });
    }
    // Always log to console — useful when Sentry isn't wired.
    console.error('[StiggOS] Uncaught error', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-8">
          <div className="card max-w-xl">
            <h1 className="text-2xl font-bold text-red-400">Something went wrong.</h1>
            <p className="mt-2 text-slate-300">The console encountered an error and stopped rendering this view. Reloading is usually the right next step.</p>
            <pre className="mt-4 text-xs text-slate-400 overflow-auto max-h-48">{this.state.error.message}</pre>
            <button className="btn-primary mt-4" onClick={() => location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
