import { requireEnv } from './env';
import cors from 'cors';
import express from 'express';
import { pool } from './db';
import { usagePeriods, type Reading } from './usage';

const app = express();
const port = Number(requireEnv('PORT'));

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'volta-api' });
});

// Usage per period for one meter. No auth, allowance or sharing rules yet.
// Express 4 doesn't catch errors thrown in async handlers, so each one needs its own try/catch.
app.get('/meters/:id/usage', async (req, res) => {
  try {
    const meter = await pool.query<{ fuel: string; unit: string }>(
      'SELECT fuel, unit FROM meters WHERE id = $1',
      [req.params.id],
    );
    if (meter.rowCount === 0) {
      res.status(404).json({ error: `meter ${req.params.id} not found` });
      return;
    }

    // ::text keeps dates as 'YYYY-MM-DD' (see ingest.ts); numeric already comes back as text.
    const readings = await pool.query<Reading>(
      'SELECT taken_at::text AS taken_at, value FROM readings WHERE meter_id = $1',
      [req.params.id],
    );

    const { fuel, unit } = meter.rows[0];
    res.json({ meter_id: req.params.id, fuel, unit, periods: usagePeriods(readings.rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(port, () => {
  console.log(`volta-api listening on http://localhost:${port}`);
});
