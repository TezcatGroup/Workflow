import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
const password = await readFile('/var/lib/workflow/db-password', 'utf8');
const sql = postgres({ host: '127.0.0.1', username: 'admin@utslp.com', database: 'workflow', password, connect_timeout: 2, max: 1 });
try {
  if (!(await sql`SELECT 1 FROM workflow_universidad_bootstrap WHERE id = 1`).length) {
    throw new Error('Inicialización incompleta');
  }
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/login`, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} finally { await sql.end({ timeout: 1 }); }
