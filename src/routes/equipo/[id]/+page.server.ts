import { redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { calcularNivel } from '$lib/progreso';
import { db } from '$lib/server/db';
import { contribucionesOpcionales, movimientosXp } from '$lib/server/db/schema';
import { obtenerIntegranteEquipo } from '$lib/server/equipo';

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) redirect(303, '/login');
  const { foto, ...integrante } = await obtenerIntegranteEquipo(locals.user, params.id);
  const [[xp], [contribuciones]] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${movimientosXp.cantidad}), 0)::int` })
      .from(movimientosXp).where(eq(movimientosXp.usuarioId, integrante.id)),
    db.select({ total: sql<number>`count(*)::int` })
      .from(contribucionesOpcionales).where(eq(contribucionesOpcionales.usuarioId, integrante.id))
  ]);

  return {
    user: locals.user,
    integrante: {
      ...integrante,
      tieneFoto: Boolean(foto),
      nivel: calcularNivel(xp.total).nivel,
      contribuciones: contribuciones.total
    }
  };
};
