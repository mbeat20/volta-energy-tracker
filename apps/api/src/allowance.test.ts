import { describe, expect, it } from 'vitest';
import { toKwh, withAllowance } from './allowance';
import type { Period } from './usage';

const period = (from: string, to: string, usage: number | null): Period => ({
  from,
  to,
  usage,
  rollover: false,
  suspect: usage === null,
});

describe('toKwh', () => {
  it('leaves electricity as it is', () => {
    expect(toKwh(18.4, 'electricity')).toBe(18.4);
  });

  it('converts gas m³ to kWh with the UK volume correction and calorific value', () => {
    // 8.3 × 1.02264 × 39.5 ÷ 3.6 = 93.1313
    expect(toKwh(8.3, 'gas')).toBe(93.13);
  });
});

describe('withAllowance', () => {
  it('gives the difference from 250 kWh for a 7-day electricity period', () => {
    const [p] = withAllowance([period('2026-07-05', '2026-07-12', 18.4)], 'electricity');
    expect(p).toMatchObject({ usage: 18.4, usage_kwh: 18.4, difference: -231.6, over: false });
  });

  it('checks gas on its converted kWh, keeping the m³ usage', () => {
    const [p] = withAllowance([period('2026-07-05', '2026-07-12', 8.3)], 'gas');
    expect(p).toMatchObject({ usage: 8.3, usage_kwh: 93.13, difference: -156.87, over: false });
  });

  it('is over only when usage is more than 250 kWh, not equal to it', () => {
    const [atLimit, justOver] = withAllowance(
      [period('2026-07-05', '2026-07-12', 250), period('2026-07-12', '2026-07-19', 250.01)],
      'electricity',
    );
    expect(atLimit).toMatchObject({ difference: 0, over: false });
    expect(justOver).toMatchObject({ difference: 0.01, over: true });
  });

  it('does not check periods longer than 7 days', () => {
    const [p] = withAllowance([period('2026-07-05', '2026-07-19', 300)], 'electricity');
    expect(p).toMatchObject({ usage_kwh: 300, difference: null, over: null });
  });

  it('does not check suspect periods, whose usage is unknown', () => {
    const [p] = withAllowance([period('2026-07-05', '2026-07-12', null)], 'gas');
    expect(p).toMatchObject({ usage_kwh: null, difference: null, over: null });
  });
});
