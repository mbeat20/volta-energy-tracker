// Checks usage periods against the allowance. Pure, like usage.ts and rules.ts.
import type { Period } from './usage';

// A member's allowance for one reading period, in kWh. Only checked on periods of
// PERIOD_DAYS or fewer; see SOLUTION.md.
export const ALLOWANCE_KWH = 250;
export const PERIOD_DAYS = 7;

// Gas meters measure volume (m³). Typical UK values for turning that into energy:
// kWh = m³ × VOLUME_CORRECTION × GAS_CALORIFIC_VALUE ÷ MJ_PER_KWH
export const VOLUME_CORRECTION = 1.02264; // adjusts the volume for temperature and pressure
export const GAS_CALORIFIC_VALUE = 39.5; // MJ of energy per m³
export const MJ_PER_KWH = 3.6;

export type AllowancePeriod = Period & {
  usage_kwh: number | null; // usage in kWh (gas converted). null when suspect
  difference: number | null; // usage_kwh - ALLOWANCE_KWH; negative means under. null if not checked
  over: boolean | null; // usage_kwh > ALLOWANCE_KWH. null if not checked
};

// Adds usage_kwh to each period and checks it against the allowance. A period is not
// checked (difference and over are null) if it's longer than PERIOD_DAYS, its usage is
// unknown because it's suspect, or the fuel isn't one we know how to convert.
export function withAllowance(periods: Period[], fuel: string): AllowancePeriod[] {
  return periods.map((p) => {
    const usage_kwh = p.usage === null ? null : toKwh(p.usage, fuel);
    if (usage_kwh === null || daysBetween(p.from, p.to) > PERIOD_DAYS) {
      return { ...p, usage_kwh, difference: null, over: null };
    }
    // In hundredths, as in usage.ts, so 93.13 - 250 is exactly -156.87.
    const difference = toHundredths(usage_kwh) - ALLOWANCE_KWH * 100;
    return { ...p, usage_kwh, difference: difference / 100, over: difference > 0 };
  });
}

// Electricity is already in kWh. Gas is converted and rounded to 2 decimal places.
export function toKwh(usage: number, fuel: string): number | null {
  if (fuel === 'electricity') return usage;
  if (fuel === 'gas') {
    return toHundredths((usage * VOLUME_CORRECTION * GAS_CALORIFIC_VALUE) / MJ_PER_KWH) / 100;
  }
  return null;
}

// 'YYYY-MM-DD' strings parse as midnight UTC, so the gap is a whole number of days.
function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

function toHundredths(value: number): number {
  return Math.round(value * 100);
}
