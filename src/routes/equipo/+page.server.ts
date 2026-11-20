import { redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos, usuarios } from '$lib/server/db/schema';
import { exigirEncargadoEquipo } from '$lib/server/equipo';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const user = exigirEncargadoEquipo(locals.user);
  if (!user.departamentoId) return { user, departamento: null, miembros: [] };
  const [departamento] = await db.select({ nombre: departamentos.nombre }).from(departamentos).where(eq(departamentos.id, user.departamentoId));
  const miembros = await db.select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol, fotoPerfil: usuarios.fotoPerfil })
    .from(usuarios).where(and(eq(usuarios.departamentoId, user.departamentoId),
      eq(usuarios.activo, true))).orderBy(asc(usuarios.nombre));
  return { user, departamento: departamento?.nombre ?? null, miembros };
};
