import 'dotenv/config';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { usuarios } from '../src/lib/server/db/schema';

if (process.env.NODE_ENV === 'production') throw new Error('La cuenta de demostración no se crea en producción.');
const url = process.env.DATABASE_URL;
const password = process.env.DEMO_ADMIN_PASSWORD;
if (!url || !password) throw new Error('Configura DATABASE_URL y DEMO_ADMIN_PASSWORD.');
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('La cuenta de demostración solo se crea en una base local.');
}
const client = postgres(url);
const db = drizzle(client);
try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id,
    memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 });
  const [existing] = await db.select({ id: usuarios.id }).from(usuarios)
    .where(eq(usuarios.email, 'admin@local.test'));
  if (existing) {
    await db.update(usuarios).set({ passwordHash, activo: true, rol: 'ADMIN',
      intentosFallidos: 0, bloqueadoHasta: null, actualizadoEn: new Date() })
      .where(eq(usuarios.id, existing.id));
  } else {
    await db.insert(usuarios).values({ nombre: 'Administrador de demostración',
      email: 'admin@local.test', passwordHash, rol: 'ADMIN' });
  }
  console.log('Cuenta administradora local de demostración lista.');
} finally {
  await client.end();
}
