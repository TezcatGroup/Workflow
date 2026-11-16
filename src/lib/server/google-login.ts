import { eq, sql } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { usuarios, auditoriaUsuarios } from '$lib/server/db/schema';
import { crearSesion } from '$lib/server/auth';
import { GoogleAccessError, type GoogleIdentity } from '$lib/server/google-oauth';

// El correo se usa solo después de verificar la identidad firmada por Google.
// Nunca se inserta un usuario: la cuenta debe haber sido creada por administración.
export async function accederConGoogle(identity: GoogleIdentity, cookies: Cookies, secure: boolean) {
  return db.transaction(async tx => {
    const matches = await tx.select().from(usuarios)
      .where(sql`lower(trim(${usuarios.email})) = ${identity.email}`).orderBy(usuarios.id).limit(2).for('update');
    const user = matches[0];
    if (matches.length !== 1 || !user.activo ||
      (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) ||
      (user.googleSub && user.googleSub !== identity.sub)) throw new GoogleAccessError('Cuenta no disponible');
    const [linked] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.googleSub, identity.sub));
    if (linked && linked.id !== user.id) throw new GoogleAccessError('Identidad ya asociada');
    await tx.update(usuarios).set({ googleSub: identity.sub, intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(usuarios.id, user.id));
    await tx.insert(auditoriaUsuarios).values({ actorId: user.id, usuarioObjetivoId: user.id,
      accion: 'INICIO_SESION_GOOGLE', detalle: {} });
    await crearSesion(user.id, cookies, tx, secure);
    return user.rol === 'ADMIN' ? '/admin' : '/dashboard';
  });
}
