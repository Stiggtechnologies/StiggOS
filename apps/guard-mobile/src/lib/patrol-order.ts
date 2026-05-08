// Patrol-order helpers. Pure functions — testable without DOM/supabase.
//
// Why randomize: a hostile observer who watches a few patrols can predict the
// next checkpoint and time their activity around it. A per-shift shuffle
// keeps the route unpredictable across shifts but reproducible within one
// shift (the same shift_id always produces the same order, so a guard who
// reloads the page sees the same plan).

export function shufflePatrol<T>(items: T[], seed?: number): T[] {
  const arr = items.slice();
  let rng: () => number;
  if (seed != null) {
    let s = seed >>> 0 || 1;
    rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  } else {
    rng = Math.random;
  }
  // Fisher–Yates.
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// Map a UUID (or any string) to a stable 32-bit seed for shufflePatrol.
// Uses a small djb2-style hash. Same input → same output, every run.
export function seedFromString(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}
