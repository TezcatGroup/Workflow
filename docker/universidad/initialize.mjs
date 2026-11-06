import postgres from 'postgres';
import argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await migrate(drizzle(sql), { migrationsFolder: '/app/drizzle' });
  const email = (process.env.ADMIN_EMAIL || 'admin@universidad.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'WorkflowUniversidad123!';
  if (!email.includes('@') || email === 'admin@local.test' || password.length < 12) {
    throw new Error('ADMIN_EMAIL debe ser válido y ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }
  // Un único administrador inicial por base, aunque cambien las variables después.
  await sql`CREATE TABLE IF NOT EXISTS workflow_universidad_bootstrap (id integer PRIMARY KEY CHECK (id = 1))`;
  await sql.begin(async tx => {
    await tx`LOCK TABLE workflow_universidad_bootstrap IN EXCLUSIVE MODE`;
    if ((await tx`SELECT id FROM workflow_universidad_bootstrap WHERE id = 1`).length) return;
    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await tx`INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ('Administrador universidad', ${email}, ${hash}, 'ADMIN') ON CONFLICT (email) DO NOTHING`;
    await tx`INSERT INTO workflow_universidad_bootstrap (id) VALUES (1)`;
    console.log('Inicialización del administrador completada.');
  });
  console.log('Migraciones completadas.');
} finally {
  await sql.end();
}
