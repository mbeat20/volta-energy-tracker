import { describe, expect, it } from 'vitest';
import { applyRules, type RawRow } from './rules';

const meters = new Map([
  ['MTR-1001', '2025-03-14'],
  ['MTR-1005', '2026-07-19'],
]);

// A clean row; each test overrides only the field it's about.
function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    reading_id: 'RDG-4001',
    meter_id: 'MTR-1001',
    taken_at: '2026-07-05',
    value: '18423.00',
    source: 'actual',
    verified: 'true',
    ...overrides,
  };
}

describe('applyRules', () => {
  it('trims whitespace from every field and logs it', () => {
    const result = applyRules(
      row({ reading_id: ' RDG-4001', meter_id: '  MTR-1001 ', value: '18423.00 ' }),
      meters,
    );
    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.reading).toMatchObject({
      reading_id: 'RDG-4001',
      meter_id: 'MTR-1001',
      value: '18423.00',
    });
    expect(result.repairs).toEqual([
      'trimmed whitespace from reading_id',
      'trimmed whitespace from meter_id',
      'trimmed whitespace from value',
    ]);
  });

  it('rejects a meter_id that is not a known meter', () => {
    const result = applyRules(row({ meter_id: 'MTR-9999' }), meters);
    expect(result).toMatchObject({ status: 'rejected', reason: "unknown meter_id 'MTR-9999'" });
  });

  it('maps every spelling of verified to true or false', () => {
    for (const text of ['Y', 'yes', 'true', 'TRUE', '1']) {
      expect(applyRules(row({ verified: text }), meters)).toMatchObject({
        reading: { verified: true },
      });
    }
    for (const text of ['N', 'no', 'NO', 'false', '0']) {
      expect(applyRules(row({ verified: text }), meters)).toMatchObject({
        reading: { verified: false },
      });
    }
  });

  it('keeps YYYY-MM-DD, and converts DD/MM/YYYY with a repair logged', () => {
    expect(applyRules(row({ taken_at: '2026-08-09' }), meters)).toMatchObject({
      reading: { taken_at: '2026-08-09' },
      repairs: [],
    });
    expect(applyRules(row({ taken_at: '09/08/2026' }), meters)).toMatchObject({
      reading: { taken_at: '2026-08-09' },
      repairs: ["converted taken_at '09/08/2026' to 2026-08-09"],
    });
  });

  it('rejects empty, N/A, non-numeric and negative values', () => {
    expect(applyRules(row({ value: '' }), meters)).toMatchObject({ reason: 'value is empty' });
    expect(applyRules(row({ value: 'N/A' }), meters)).toMatchObject({ reason: 'value is N/A' });
    expect(applyRules(row({ value: 'abc' }), meters)).toMatchObject({
      reason: "value 'abc' is not a number",
    });
    expect(applyRules(row({ value: '-118.75' }), meters)).toMatchObject({
      reason: 'value -118.75 is negative',
    });
  });

  it('rejects a reading taken before the meter was installed, but accepts install day', () => {
    expect(applyRules(row({ meter_id: 'MTR-1005', taken_at: '2026-07-05' }), meters)).toMatchObject(
      {
        status: 'rejected',
        reason: 'taken_at 2026-07-05 is before meter installed_on 2026-07-19',
      },
    );
    expect(applyRules(row({ meter_id: 'MTR-1005', taken_at: '2026-07-19' }), meters).status).toBe(
      'accepted',
    );
  });

  it('uppercases meter_id before the lookup and logs it', () => {
    expect(applyRules(row({ meter_id: 'mtr-1001' }), meters)).toMatchObject({
      status: 'accepted',
      reading: { meter_id: 'MTR-1001' },
      repairs: ["uppercased meter_id 'mtr-1001'"],
    });
  });

  it('rejects a value with a comma decimal', () => {
    expect(applyRules(row({ value: '2512,40' }), meters)).toMatchObject({
      status: 'rejected',
      reason: "value '2512,40' uses a comma as the decimal separator",
    });
  });
});
