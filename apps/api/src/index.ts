import { requireEnv } from './env';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(requireEnv('PORT'));

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'volta-api' });
});

// Your endpoints go here.

app.listen(port, () => {
  console.log(`volta-api listening on http://localhost:${port}`);
});
