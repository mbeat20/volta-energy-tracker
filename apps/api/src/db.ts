import { requireEnv } from './env';
import { Pool } from 'pg';

// Connection only. Schema, migrations and queries are yours to design.
export const pool = new Pool({ connectionString: requireEnv('DATABASE_URL') });
