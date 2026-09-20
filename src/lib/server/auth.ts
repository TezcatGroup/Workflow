import { createHash, randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sesiones, usuarios } from '$lib/server/db/schema';
import argon2 from 'argon2';

export const COOKIE_NAME = 'tezcat_session';
const TTL_SECONDS = 60 * 60 * 24 * 7;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function crearSesion(usuarioId: string, cookies: Cookies): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await db.insert(sesiones).values({
    usuarioId,
    tokenHash: tokenHash(token),
    expiraEn: new Date(Date.now() + TTL_SECONDS * 1000)
  });
  cookies.set(COOKIE_NAME, token, {
    path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: TTL_SECONDS
  });
}

export async function leerSesion(token: string) {
  const [row] = await db.select({
    id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol,
    departamentoId: usuarios.departamentoId
  }).from(sesiones)
    .innerJoin(usuarios, eq(sesiones.usuarioId, usuarios.id))
    .where(and(eq(sesiones.tokenHash, tokenHash(token)), gt(sesiones.expiraEn, new Date()), eq(usuarios.activo, true)))
    .limit(1);
  return row ?? null;
}

export async function cerrarSesion(token: string, cookies: Cookies): Promise<void> {
  await db.delete(sesiones).where(eq(sesiones.tokenHash, tokenHash(token)));
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function autenticar(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!dev && normalizedEmail === 'admin@local.test') return null;
  const lookupEmail = dev && normalizedEmail === 'admin' ? 'admin@local.test' : normalizedEmail;
  const [user] = await db.select().from(usuarios)
    .where(eq(usuarios.email, lookupEmail)).limit(1);
  if (!user || !user.activo || (user.bloqueadoHasta && user.bloqueadoHasta > new Date())) return null;
  const valido = await argon2.verify(user.passwordHash, password);
  if (!valido) {
    const intentos = sql<number>`case when ${usuarios.bloqueadoHasta} is not null
      and ${usuarios.bloqueadoHasta} <= now() then 1
      else ${usuarios.intentosFallidos} + 1 end`;
    await db.update(usuarios).set({
      intentosFallidos: intentos,
      bloqueadoHasta: sql`case when (${intentos}) >= 5
        then now() + interval '15 minutes' else null end`
    }).where(eq(usuarios.id, user.id));
    return null;
  }
  await db.update(usuarios).set({ intentosFallidos: 0, bloqueadoHasta: null })
    .where(eq(usuarios.id, user.id));
  return user;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id,
    memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 });
}
