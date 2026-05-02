// Seasonal-pricing slot picker. Used by billing-run to compute the right
// monthly rate for the period being invoiced.
//
// Schedule shape:
//   { kind: 'seasonal' | 'flat', schedule: [
//       { label, months: number[], monthly_cad: number, components?: [...] },
//       ...
//   ]}
//
// pickSeasonalRate returns the matching slot for the period. If multiple slots
// could apply (e.g. mid-month transition), we use the slot of the period_start.

export interface PricingComponent { label: string; monthly_cad: number }
export interface PricingSlot {
  label: string;
  months: number[];
  monthly_cad: number;
  components?: PricingComponent[];
}
export interface PricingSchedule {
  kind: 'seasonal' | 'flat';
  default_currency?: string;
  schedule: PricingSlot[];
}

export function pickSeasonalRate(
  schedule: PricingSchedule | null | undefined,
  fallback_monthly_cad: number | null,
  period_start_iso: string,
): { monthly_cad: number; label: string; components: PricingComponent[] } {
  if (!schedule || schedule.kind === 'flat') {
    return { monthly_cad: fallback_monthly_cad ?? 0, label: 'flat', components: [] };
  }
  const m = new Date(period_start_iso + 'T00:00:00Z').getUTCMonth() + 1;
  const slot = schedule.schedule.find((s) => s.months.includes(m));
  if (!slot) {
    return { monthly_cad: fallback_monthly_cad ?? 0, label: 'unmapped', components: [] };
  }
  return {
    monthly_cad: slot.monthly_cad,
    label: slot.label,
    components: slot.components ?? [],
  };
}
