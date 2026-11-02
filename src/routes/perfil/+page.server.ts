import { redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos, movimientosXp, movimientosPuntos } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  let departamento: string | null = null;
  if (user.departamentoId) {
    const [dep] = await db
      .select({ nombre: departamentos.nombre })
      .from(departamentos)
      .where(eq(departamentos.id, user.departamentoId));
    departamento = dep?.nombre ?? null;
  }

  const [[exp], [monedas]] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${movimientosXp.cantidad}), 0)` }).from(movimientosXp).where(eq(movimientosXp.usuarioId, user.id)),
    db.select({ total: sql<string>`coalesce(sum(${movimientosPuntos.cantidad}), 0)` }).from(movimientosPuntos).where(eq(movimientosPuntos.usuarioId, user.id))
  ]);
  return { user, departamento, exp: String(exp.total), monedas: String(monedas.total) };
};