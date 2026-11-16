import { desc, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { exigirAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, usuarios } from '$lib/server/db/schema';

function nombreArchivado(detalle: unknown, clave: string): string | null {
  if (!detalle || typeof detalle !== 'object') return null;
  const valor = (detalle as Record<string, unknown>)[clave];
  if (!valor || typeof valor !== 'object' || !('nombre' in valor) || typeof valor.nombre !== 'string') return null;
  return `${valor.nombre} (cuenta eliminada)`;
}

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  const eventos = await db.select().from(auditoriaUsuarios)
    .orderBy(desc(auditoriaUsuarios.creadaEn), desc(auditoriaUsuarios.id)).limit(100);
  const ids = [...new Set(eventos.flatMap(e => [e.actorId, e.usuarioObjetivoId]).filter((id): id is string => !!id))];
  const personas = ids.length ? await db.select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios).where(inArray(usuarios.id, ids)) : [];
  const nombres = new Map(personas.map(u => [u.id, u.nombre]));
  return { eventos: eventos.map(e => ({ ...e,
    actorNombre: e.actorId ? nombres.get(e.actorId) ?? 'Usuario no disponible' : nombreArchivado(e.detalle, 'actorEliminado') ?? 'Cuenta no disponible',
    objetivoNombre: e.usuarioObjetivoId ? nombres.get(e.usuarioObjetivoId) ?? 'Usuario no disponible' : nombreArchivado(e.detalle, 'usuarioEliminado')
  })) };
};
