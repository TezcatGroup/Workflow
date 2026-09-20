import 'dotenv/config';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { usuarios } from '../src/lib/server/db/schema';

const url = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!url || !email || !password || password.length < 12) {
  throw new Error('Configura DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres).');
}
const client = postgres(url);
const db = drizzle(client);
try {
  const [existing] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  if (existing) {
    console.log('El administrador inicial ya existe.');
  } else {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id,
      memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 });
    await db.insert(usuarios).values({ nombre: 'Administrador inicial', email,
      passwordHash, rol: 'ADMIN' });
    console.log('Administrador inicial creado.');
  }
} finally {
  await client.end();
}
