import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './db';

// Runs every .sql file in apps/api/sql, in filename order (001_, 002_, ...).
// Each file must be safe to re-run (IF NOT EXISTS), so this can run any number of times.
const sqlDir = fileURLToPath(new URL('../sql/', import.meta.url));

try {
  const files = (await readdir(sqlDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(sqlDir + file, 'utf8');
    await pool.query(sql);
    console.log(`applied ${file}`);
  }
} catch (err) {
  console.error('migration failed:', err);
  process.exitCode = 1;
} finally {
  // Open pool connections would keep Node running; close them so the script exits.
  await pool.end();
}
