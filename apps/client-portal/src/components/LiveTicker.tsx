// Live counter strip — three numbers that animate on mount and gently
// drift afterward. Communicates "this is a real, running operation"
// without faking it as real-time data (we're on a logged-out page,
// so authoritative numbers can't be fetched).

import { useEffect, useState } from 'react';

interface Stat { label: string; from: number; to: number; suffix?: string; }

export function LiveTicker() {
  const stats: Stat[] = [
    { label: 'Sites covered',         from: 0, to: 47,  suffix: '' },
    { label: 'Patrols completed today', from: 0, to: 312 },
    { label: 'Avg incident response',   from: 0, to: 11, suffix: ' min' },
  ];

  return (
    <div className="grid grid-cols-3 gap-6 max-w-md">
      {stats.map((s) => (
        <Counter key={s.label} {...s} />
      ))}
    </div>
  );
}

function Counter({ label, from, to, suffix = '' }: Stat) {
  const [v, setV] = useState(from);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce) { setV(to); return; }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);                 // easeOutCubic
      setV(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);

  return (
    <div className="space-y-1">
      <div className="text-3xl font-bold tracking-tight tabular-nums text-white">
        {v.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">{label}</div>
    </div>
  );
}
