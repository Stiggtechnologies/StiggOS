import { describe, expect, it } from 'vitest';
import { isArmed } from '../src/arming.js';
import type { ArmingSchedule } from '../src/index.js';

const business: ArmingSchedule = {
  id: 's1', name: 'business hours', is_active: true,
  spec: { timezone: 'America/Edmonton',
    windows: [{ days: [1,2,3,4,5], start: '09:00', end: '17:00' }] },
};
const overnight: ArmingSchedule = {
  id: 's2', name: 'after-hours', is_active: true,
  spec: { timezone: 'America/Edmonton',
    windows: [{ days: [1,2,3,4,5,6,7], start: '17:01', end: '08:59' }] },
};

describe('isArmed', () => {
  it('returns true inside a same-day window', () => {
    // 2026-05-01 is a Friday. 12:00 America/Edmonton == 18:00 UTC (MDT, UTC-6)
    expect(isArmed(new Date('2026-05-01T18:00:00Z'), business)).toBe(true);
  });
  it('returns false on a Saturday for the business schedule', () => {
    expect(isArmed(new Date('2026-05-02T18:00:00Z'), business)).toBe(false);
  });
  it('returns false at 08:00 on a weekday', () => {
    // 08:00 Edmonton == 14:00 UTC (MDT)
    expect(isArmed(new Date('2026-05-01T14:00:00Z'), business)).toBe(false);
  });
  it('handles overnight windows that cross midnight', () => {
    // 02:00 Edmonton on Saturday == 08:00 UTC
    expect(isArmed(new Date('2026-05-02T08:00:00Z'), overnight)).toBe(true);
  });
  it('returns false when the schedule is inactive', () => {
    expect(isArmed(new Date(), { ...business, is_active: false })).toBe(false);
  });
});
