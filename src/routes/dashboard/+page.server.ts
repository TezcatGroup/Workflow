import { redirect } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos, usuarios } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  if (user.rol === 'ADMIN') {
    const [u] = await db.select({ total: sql<number>`count(*)::int` }).from(usuarios);
    const [d] = await db.select({ total: sql<number>`count(*)::int` }).from(departamentos);
    return { user, widgets: ['usuarios', 'departamentos', 'auditoria'],
      metricas: { usuarios: u.total, departamentos: d.total } };
  }
  if (user.rol === 'ENCARGADO') {
    const [m] = user.departamentoId
      ? await db.select({ total: sql<number>`count(*)::int` }).from(usuarios)
          .where(and(eq(usuarios.departamentoId, user.departamentoId), eq(usuarios.activo, true)))
      : [{ total: 0 }];
    return { user, widgets: ['equipo', 'perfil'], metricas: { miembrosActivos: m.total } };
  }
  return { user, widgets: ['perfil'], metricas: {} };
};
