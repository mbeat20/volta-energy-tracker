import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './db';

// Loads seed/members.json then seed/meters.json (meters reference members).
// Upserts on the primary key, so re-running is safe and picks up any edits to the files.

// The shapes of the JSON files. 
type MemberJson = { member_id: string; name: string };
type MeterJson = {
  meter_id: string;
  member_id: string;
  fuel: string;
  unit: string;
  installed_on: string;
  public: boolean;
};

const seedDir = fileURLToPath(new URL('../../../seed/', import.meta.url));

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(seedDir + file, 'utf8')) as T;
}

const members = await readJson<MemberJson[]>('members.json');
const meters = await readJson<MeterJson[]>('meters.json');

// One connection for the whole load, so BEGIN/COMMIT wrap every insert:
// either both files land or neither does.
const client = await pool.connect();
//The transaction
try {
  await client.query('BEGIN');

  for (const m of members) {
    await client.query(
      `INSERT INTO members (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [m.member_id, m.name],
    );
  }

  for (const m of meters) {
    await client.query(
      `INSERT INTO meters (id, member_id, fuel, unit, installed_on, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         member_id = EXCLUDED.member_id,
         fuel = EXCLUDED.fuel,
         unit = EXCLUDED.unit,
         installed_on = EXCLUDED.installed_on,
         is_public = EXCLUDED.is_public`,
      [m.meter_id, m.member_id, m.fuel, m.unit, m.installed_on, m.public], // JSON 'public' -> is_public
    );
  }

  await client.query('COMMIT');
  console.log(`seeded ${members.length} members, ${meters.length} meters`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('seed failed, nothing was written:', err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
