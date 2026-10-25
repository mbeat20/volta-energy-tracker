// Cleaning rules for one row of readings.csv. Pure: no database, no files,
// so every rule can be tested directly. The ingest decides what to do with the result.

// One CSV row as the parser hands it over: every field is still text.
export type RawRow = {
  reading_id: string;
  meter_id: string;
  taken_at: string;
  value: string;
  source: string;
  verified: string;
};

// A row that passed every rule, ready for the readings table.
export type CleanReading = {
  reading_id: string;
  meter_id: string;
  taken_at: string; // YYYY-MM-DD
  value: string; // decimal text, e.g. '18423.00'; kept as text so no float rounding creeps in
  source: string;
  verified: boolean;
};

// Either accepted or rejected; `status` says which, and TypeScript only lets you
// read `reading` after checking for 'accepted' (and `reason` after 'rejected').
export type RowResult =
  | { status: 'accepted'; reading: CleanReading; repairs: string[] }
  | { status: 'rejected'; reason: string; repairs: string[] };

// meter_id -> installed_on (YYYY-MM-DD), loaded from the meters table by the caller.
export type MeterInstallDates = Map<string, string>;

const TRUE_VALUES = ['y', 'yes', 'true', '1'];
const FALSE_VALUES = ['n', 'no', 'false', '0'];

export function applyRules(raw: RawRow, meters: MeterInstallDates): RowResult {
  const repairs: string[] = [];

  // Trim whitespace from every field.
  const row = {} as RawRow;
  for (const key of Object.keys(raw) as (keyof RawRow)[]) {
    const original = raw[key] ?? '';
    row[key] = original.trim();
    if (row[key] !== original) repairs.push(`trimmed whitespace from ${key}`);
  }

  // Uppercase meter_id before the lookup.
  const meterId = row.meter_id.toUpperCase();
  if (meterId !== row.meter_id) repairs.push(`uppercased meter_id '${row.meter_id}'`);

  // Reject if the meter is unknown.
  const installedOn = meters.get(meterId);
  if (installedOn === undefined) {
    return { status: 'rejected', reason: `unknown meter_id '${meterId}'`, repairs };
  }

  // Dates: keep YYYY-MM-DD; convert DD/MM/YYYY and log it.
  const date = parseDate(row.taken_at);
  if (date === null) {
    return { status: 'rejected', reason: `unrecognised taken_at '${row.taken_at}'`, repairs };
  }
  if (date !== row.taken_at) repairs.push(`converted taken_at '${row.taken_at}' to ${date}`);

  // Reject readings taken before the meter was installed.
  // YYYY-MM-DD strings sort in date order, so a string comparison is a date comparison.
  if (date < installedOn) {
    return {
      status: 'rejected',
      reason: `taken_at ${date} is before meter installed_on ${installedOn}`,
      repairs,
    };
  }

  // Value: reject empty, N/A, comma decimals, negatives and anything else non-numeric.
  const valueProblem = checkValue(row.value);
  if (valueProblem !== null) {
    return { status: 'rejected', reason: valueProblem, repairs };
  }

  // Verified: map the known spellings to true/false.
  const verified = parseVerified(row.verified);
  if (verified === null) {
    return { status: 'rejected', reason: `unrecognised verified '${row.verified}'`, repairs };
  }

  return {
    status: 'accepted',
    reading: {
      reading_id: row.reading_id,
      meter_id: meterId,
      taken_at: date,
      value: row.value,
      source: row.source,
      verified,
    },
    repairs,
  };
}

// 'YYYY-MM-DD' stays as it is, 'DD/MM/YYYY' becomes 'YYYY-MM-DD'.
// Returns null for any other format, or for a date that doesn't exist (e.g. 31/02/2026).
export function parseDate(text: string): string | null {
  let iso: string;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    iso = text;
  } else if (dmy) {
    const [, day, month, year] = dmy;
    iso = `${year}-${month}-${day}`;
  } else {
    return null;
  }
  // Round-trip through Date: an impossible date like 2026-02-31 comes back different.
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

// Returns the reason the value is unusable, or null if it's fine.
export function checkValue(text: string): string | null {
  if (text === '') return 'value is empty';
  if (text.toUpperCase() === 'N/A') return 'value is N/A';
  if (/^-?\d+,\d+$/.test(text)) return `value '${text}' uses a comma as the decimal separator`;
  if (/^-\d+(\.\d+)?$/.test(text)) return `value ${text} is negative`;
  if (!/^\d+(\.\d+)?$/.test(text)) return `value '${text}' is not a number`;
  return null;
}

// Y/yes/true/1 -> true, N/no/false/0 -> false, any case. Anything else -> null.
export function parseVerified(text: string): boolean | null {
  const lower = text.toLowerCase();
  if (TRUE_VALUES.includes(lower)) return true;
  if (FALSE_VALUES.includes(lower)) return false;
  return null;
}
