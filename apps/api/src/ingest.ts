import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { pool } from './db';
import { applyRules, type CleanReading, type RawRow } from './rules';

// Loads readings.csv into the readings table and records what happened in
// ingest_runs (one row per run) and ingest_issues (one row per repaired or rejected line).
// Safe to re-run: a second run of the same file inserts nothing and counts every reading as unchanged.
//
// Usage: pnpm db:ingest [path/to/file.csv]   (defaults to seed/readings.csv)

const defaultFile = fileURLToPath(new URL('../../../seed/readings.csv', import.meta.url));
const filePath = process.argv[2] ?? defaultFile;

type Issue = {
  line_number: number;
  reading_id: string;
  raw_row: RawRow;
  outcome: 'repaired' | 'rejected';
  reason: string;
};

// An accepted reading and where it came from, so later issues can point back at it.
type Kept = { line_number: number; raw_row: RawRow; reading: CleanReading; repairs: string[] };

// 1. Start the run. Committed on its own, before the main transaction, so a run that
//    crashes part-way still leaves a row behind with finished_at = null.
const run = await pool.query<{ id: number }>(
  'INSERT INTO ingest_runs (file_name) VALUES ($1) RETURNING id',
  [basename(filePath)],
);
const runId = run.rows[0].id;
console.log(`ingest run ${runId}: ${filePath}`);

const client = await pool.connect();
try {
  // 2. Load the meters into the Map applyRules expects.
  //    installed_on::text keeps the date as 'YYYY-MM-DD'; without the cast, pg turns a
  //    date into a JavaScript Date at local midnight, which can shift it by a day.
  const meterRows = await client.query<{ id: string; installed_on: string }>(
    'SELECT id, installed_on::text AS installed_on FROM meters',
  );
  const meters = new Map(meterRows.rows.map((m) => [m.id, m.installed_on]));

  // 3. Read and parse the CSV. bom strips the byte-order mark the file starts with;
  //    columns: true turns each line into an object keyed by the header row.
  const rows: RawRow[] = parse(await readFile(filePath), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  });

  // 4. Apply the single-row rules, then the cross-row ones.
  //    keptById holds the reading that currently wins for each reading_id.
  const issues: Issue[] = [];
  const keptById = new Map<string, Kept>();

  rows.forEach((raw, i) => {
    const line_number = i + 2; // line 1 is the header
    const result = applyRules(raw, meters);

    if (result.status === 'rejected') {
      issues.push({
        line_number,
        reading_id: raw.reading_id,
        raw_row: raw,
        outcome: 'rejected',
        reason: result.reason,
      });
      return;
    }

    const current: Kept = {
      line_number,
      raw_row: raw,
      reading: result.reading,
      repairs: result.repairs,
    };
    const earlier = keptById.get(result.reading.reading_id);

    if (earlier === undefined) {
      keptById.set(result.reading.reading_id, current);
    } else if (sameReading(earlier.reading, current.reading)) {
      // Exact duplicate: keep the first copy, drop this one.
      issues.push({
        line_number,
        reading_id: current.reading.reading_id,
        raw_row: raw,
        outcome: 'rejected',
        reason: `duplicate of line ${earlier.line_number}`,
      });
    } else {
      // Same reading_id, different values: the later line wins, the earlier one is logged as lost.
      issues.push({
        line_number: earlier.line_number,
        reading_id: earlier.reading.reading_id,
        raw_row: earlier.raw_row,
        outcome: 'rejected',
        reason: `superseded by line ${line_number} (value ${earlier.reading.value} -> ${current.reading.value})`,
      });
      keptById.set(result.reading.reading_id, current);
    }
  });

  // Repairs are logged only for rows that actually land, so each line has at most one issue.
  for (const kept of keptById.values()) {
    if (kept.repairs.length > 0) {
      issues.push({
        line_number: kept.line_number,
        reading_id: kept.reading.reading_id,
        raw_row: kept.raw_row,
        outcome: 'repaired',
        reason: kept.repairs.join('; '),
      });
    }
  }

  // 5. Write everything in one transaction: either the whole file lands or none of it does.
  await client.query('BEGIN');

  const counts = { inserted: 0, updated: 0, unchanged: 0 };
  for (const { reading: r } of keptById.values()) {
    // The WHERE skips the update when nothing changed, so RETURNING gives no row: that's "unchanged".
    // xmax = 0 is Postgres's marker for a freshly inserted row (an updated row has a non-zero xmax).
    const result = await client.query<{ inserted: boolean }>(
      `INSERT INTO readings (reading_id, meter_id, taken_at, value, source, verified, loaded_by_run_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (reading_id) DO UPDATE SET
         meter_id = EXCLUDED.meter_id,
         taken_at = EXCLUDED.taken_at,
         value = EXCLUDED.value,
         source = EXCLUDED.source,
         verified = EXCLUDED.verified,
         loaded_by_run_id = EXCLUDED.loaded_by_run_id
       WHERE (readings.meter_id, readings.taken_at, readings.value, readings.source, readings.verified)
             IS DISTINCT FROM
             (EXCLUDED.meter_id, EXCLUDED.taken_at, EXCLUDED.value, EXCLUDED.source, EXCLUDED.verified)
       RETURNING (xmax = 0) AS inserted`,
      [r.reading_id, r.meter_id, r.taken_at, r.value, r.source, r.verified, runId],
    );
    if (result.rowCount === 0) counts.unchanged++;
    else if (result.rows[0].inserted) counts.inserted++;
    else counts.updated++;
  }

  for (const issue of issues) {
    await client.query(
      `INSERT INTO ingest_issues (ingest_run_id, line_number, reading_id, raw_row, outcome, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        runId,
        issue.line_number,
        issue.reading_id,
        JSON.stringify(issue.raw_row),
        issue.outcome,
        issue.reason,
      ],
    );
  }

  // 6. Finish the run. The table's CHECK refuses this unless the counts add up to rows_read.
  const rejected = issues.filter((i) => i.outcome === 'rejected').length;
  await client.query(
    `UPDATE ingest_runs
     SET finished_at = now(), rows_read = $2, inserted = $3, updated = $4, unchanged = $5, rejected = $6
     WHERE id = $1`,
    [runId, rows.length, counts.inserted, counts.updated, counts.unchanged, rejected],
  );

  await client.query('COMMIT');
  console.log(
    `read ${rows.length}: inserted ${counts.inserted}, updated ${counts.updated}, ` +
      `unchanged ${counts.unchanged}, rejected ${rejected}`,
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`ingest run ${runId} failed, no readings were written:`, err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

function sameReading(a: CleanReading, b: CleanReading): boolean {
  return (
    a.meter_id === b.meter_id &&
    a.taken_at === b.taken_at &&
    a.value === b.value &&
    a.source === b.source &&
    a.verified === b.verified
  );
}
