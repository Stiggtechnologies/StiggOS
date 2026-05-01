// Placeholder for routes that exist in nav but aren't built yet.
// Honest about being a stub — clearly distinguished from working pages.

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-slate-400 mt-2">This module is on the roadmap but not yet implemented.</p>
      <div className="card mt-6 max-w-2xl">
        <p className="text-sm text-slate-300">
          Schema and RLS are in place for this domain. Edge functions and UI are scheduled in a follow-up sprint —
          see <code className="text-blue-300">docs/ROADMAP.md</code> for sequencing.
        </p>
      </div>
    </div>
  );
}
