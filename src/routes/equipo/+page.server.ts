import { error, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');
  if (user.rol !== 'ENCARGADO') error(403, 'Acceso restringido a encargados');
  if (!user.departamentoId) return { miembros: [] };
  const miembros = await db.select({ nombre: usuarios.nombre, rol: usuarios.rol })
    .from(usuarios).where(and(eq(usuarios.departamentoId, user.departamentoId),
      eq(usuarios.activo, true))).orderBy(asc(usuarios.nombre));
  return { miembros };
};
