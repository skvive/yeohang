import { neon, Pool as NeonPool } from '@neondatabase/serverless';
import type { QueryResultRow } from '@neondatabase/serverless';

let pool: NeonPool | null = null;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool ??= new NeonPool({ connectionString: url });
  const r = await pool.query<T>(text, values);
  return r.rows;
}

export async function dbTx<T>(fn: (client: { query: <R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) => Promise<R[]> }) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool ??= new NeonPool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wrapped = {
      async query<R extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
        const r = await client.query<R>(text, values);
        return r.rows;
      },
    };
    const out = await fn(wrapped);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
