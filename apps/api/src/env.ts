import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// One .env at the repo root drives the API and the web app.
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env at the repo root.`);
  }
  return value;
}
