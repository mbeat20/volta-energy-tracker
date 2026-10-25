import { describe, expect, it } from 'vitest';
import { usagePeriods } from './usage';

describe('usagePeriods', () => {
  it('returns the usage between each pair of consecutive readings', () => {
    expect(
      usagePeriods([
        { taken_at: '2026-07-05', value: '18423.00' },
        { taken_at: '2026-07-12', value: '18441.40' },
        { taken_at: '2026-07-19', value: '18461.55' },
      ]),
    ).toEqual([
      { from: '2026-07-05', to: '2026-07-12', usage: 18.4, rollover: false },
      { from: '2026-07-12', to: '2026-07-19', usage: 20.15, rollover: false },
    ]);
  });

  it('sorts readings by taken_at before pairing them', () => {
    const periods = usagePeriods([
      { taken_at: '2026-07-19', value: '18461.55' },
      { taken_at: '2026-07-05', value: '18423.00' },
      { taken_at: '2026-07-12', value: '18441.40' },
    ]);
    expect(periods.map((p) => [p.from, p.to])).toEqual([
      ['2026-07-05', '2026-07-12'],
      ['2026-07-12', '2026-07-19'],
    ]);
  });

  it('returns no periods for fewer than two readings', () => {
    expect(usagePeriods([])).toEqual([]);
    expect(usagePeriods([{ taken_at: '2026-07-05', value: '100.00' }])).toEqual([]);
  });

  it('treats a drop from close to 99999.99 as a rollover', () => {
    // MTR-1009 in the seed data: 99991.25 then 10.00
    expect(
      usagePeriods([
        { taken_at: '2026-07-19', value: '99991.25' },
        { taken_at: '2026-07-26', value: '10.00' },
      ]),
    ).toEqual([{ from: '2026-07-19', to: '2026-07-26', usage: 18.75, rollover: true }]);
  });

  it('does not treat a drop as a rollover when the previous reading was far from the max', () => {
    const [period] = usagePeriods([
      { taken_at: '2026-07-19', value: '50000.00' },
      { taken_at: '2026-07-26', value: '10.00' },
    ]);
    expect(period.rollover).toBe(false);
    expect(period.usage).toBe(-49990);
  });
});
