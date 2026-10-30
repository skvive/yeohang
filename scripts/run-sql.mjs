import { readFileSync } from 'node:fs';
import pg from 'pg';

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql.mjs <file.sql>');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const raw = readFileSync(file, 'utf8');
const statements = raw
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'));

try {
  for (const statement of statements) {
    await client.query(statement);
    console.log('ok:', statement.slice(0, 60).replace(/\s+/g, ' '));
  }
  console.log(`migrated ${statements.length} statements from ${file}`);
} finally {
  await client.end();
}
