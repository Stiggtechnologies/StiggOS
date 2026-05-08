import { describe, expect, it } from 'vitest';
import { shufflePatrol, seedFromString } from '../src/lib/patrol-order';

describe('shufflePatrol', () => {
  it('returns the same items, just possibly reordered', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shufflePatrol(input, 42);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c', 'd'];
    const before = input.slice();
    shufflePatrol(input, 1);
    expect(input).toEqual(before);
  });

  it('is deterministic given a seed (same seed → same order)', () => {
    const a = shufflePatrol([1, 2, 3, 4, 5, 6, 7, 8], 12345);
    const b = shufflePatrol([1, 2, 3, 4, 5, 6, 7, 8], 12345);
    expect(a).toEqual(b);
  });

  it('produces different orders for different seeds', () => {
    const a = shufflePatrol([1, 2, 3, 4, 5, 6, 7, 8], 1);
    const b = shufflePatrol([1, 2, 3, 4, 5, 6, 7, 8], 999);
    expect(a).not.toEqual(b);
  });

  it('handles a single-item list', () => {
    expect(shufflePatrol(['only'], 7)).toEqual(['only']);
  });

  it('handles an empty list', () => {
    expect(shufflePatrol([], 7)).toEqual([]);
  });
});

describe('seedFromString', () => {
  it('returns the same number for the same input', () => {
    expect(seedFromString('abc-123')).toBe(seedFromString('abc-123'));
  });

  it('returns different numbers for different inputs', () => {
    // Two arbitrary UUIDs — the chance these collide under djb2 is negligible.
    const a = seedFromString('f1d0e3f4-5b8e-4f1a-9c4d-aeb12c3d4e5f');
    const b = seedFromString('a8c1b2d3-9e8f-7a6b-5c4d-3e2f1a0b9c8d');
    expect(a).not.toBe(b);
  });

  it('always returns a positive 32-bit integer', () => {
    const s = seedFromString('any-shift-id');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(2 ** 32);
    expect(Number.isInteger(s)).toBe(true);
  });

  it('never returns 0 (seed=0 would degenerate the LCG)', () => {
    expect(seedFromString('')).not.toBe(0);
  });

  it('produces a stable cross-shift order when paired with shufflePatrol', () => {
    // The intended use: same shift_id → same order on every render.
    const shiftId = 'shift-uuid-abc';
    const cps = ['Front', 'Rear', 'Mech', 'L1', 'L2', 'Garbage'];
    const a = shufflePatrol(cps, seedFromString(shiftId));
    const b = shufflePatrol(cps, seedFromString(shiftId));
    expect(a).toEqual(b);
    // ...and a different shift gets a different order (with high probability).
    const c = shufflePatrol(cps, seedFromString('shift-uuid-xyz'));
    expect(a).not.toEqual(c);
  });
});
