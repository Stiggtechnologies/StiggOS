import { describe, expect, it } from 'vitest';
import { pickSeasonalRate } from '../src/pricing.js';
import type { PricingSchedule } from '../src/pricing.js';

const NORTHVIEW: PricingSchedule = {
  kind: 'seasonal', default_currency: 'CAD',
  schedule: [
    { label: 'summer', months: [5,6,7,8,9,10], monthly_cad: 9900,
      components: [
        { label: 'Core',          monthly_cad: 8950 },
        { label: 'MacDonald',     monthly_cad: 950 },
      ]},
    { label: 'winter', months: [11,12,1,2,3,4], monthly_cad: 14150,
      components: [
        { label: 'Core',          monthly_cad: 12500 },
        { label: 'MacDonald',     monthly_cad: 1650 },
      ]},
  ],
};

describe('pickSeasonalRate', () => {
  it('returns the summer slot for May–Oct', () => {
    for (const m of ['2026-05-01','2026-07-15','2026-10-01']) {
      expect(pickSeasonalRate(NORTHVIEW, null, m).monthly_cad).toBe(9900);
    }
  });
  it('returns the winter slot for Nov–Apr', () => {
    for (const m of ['2026-11-01','2027-01-15','2027-04-01']) {
      expect(pickSeasonalRate(NORTHVIEW, null, m).monthly_cad).toBe(14150);
    }
  });
  it('falls back to monthly_value_cad when no schedule', () => {
    expect(pickSeasonalRate(null, 1234, '2026-06-01').monthly_cad).toBe(1234);
  });
  it('returns components for the chosen season', () => {
    const r = pickSeasonalRate(NORTHVIEW, null, '2026-12-01');
    expect(r.components.map((c) => c.monthly_cad)).toEqual([12500, 1650]);
  });
});
