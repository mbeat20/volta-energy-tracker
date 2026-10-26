// Turns one meter's cumulative readings into usage per period. Pure, like rules.ts.

// The register wraps from 99999.99 back to 0 at this value.
export const METER_MAX = 100000;
// A drop counts as a rollover only if the previous reading was within this distance of
// METER_MAX. 1000 is our judgement of "close to 99999.99"; see SOLUTION.md.
export const ROLLOVER_WINDOW = 1000;

export type Reading = { taken_at: string; value: string }; // as stored: 'YYYY-MM-DD', decimal text

export type Period = {
  from: string; // taken_at of the earlier reading
  to: string; // taken_at of the later reading
  usage: number | null; // null when suspect: we can't say how much was used
  rollover: boolean; // true if the meter wrapped past METER_MAX in this period
  suspect: boolean; // true if the reading dropped and it wasn't a rollover
};

export function usagePeriods(readings: Reading[]): Period[] {
  // Sort a copy by date; YYYY-MM-DD strings sort in date order.
  const sorted = [...readings].sort((a, b) => a.taken_at.localeCompare(b.taken_at));

  const periods: Period[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    // Work in hundredths as whole numbers, so 18441.40 - 18423.00 is exactly 18.4
    // rather than 18.400000000001455 (floating point can't store most decimals exactly).
    const prev = toHundredths(previous.value);
    const curr = toHundredths(current.value);

    const dropped = curr < prev;
    const rollover = dropped && prev >= toHundredths(String(METER_MAX - ROLLOVER_WINDOW));
    // A drop that isn't a rollover would be negative usage, which can't happen: flag it instead.
    const suspect = dropped && !rollover;
    const usage = rollover ? toHundredths(String(METER_MAX)) - prev + curr : curr - prev;

    periods.push({
      from: previous.taken_at,
      to: current.taken_at,
      usage: suspect ? null : usage / 100,
      rollover,
      suspect,
    });
  }
  return periods;
}

function toHundredths(value: string): number {
  return Math.round(Number(value) * 100);
}
