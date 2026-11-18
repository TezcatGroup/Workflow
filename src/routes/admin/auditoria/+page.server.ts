import { and, desc, eq, gte, lt, inArray, sql, count } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
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

export const load: PageServerLoad = async ({ locals, url }) => {
  exigirAdmin(locals.user);
  const filtros = { q: (url.searchParams.get('q') ?? '').trim().slice(0,200), accion: (url.searchParams.get('accion') ?? '').slice(0,80), desde: url.searchParams.get('desde') ?? '', hasta: url.searchParams.get('hasta') ?? '' };
  function fecha(s: string) {
    const d = new Date(`${s}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== s) error(400, 'Fecha inválida');
    return d;
  }
  const condiciones = [];
  if (filtros.accion) condiciones.push(eq(auditoriaUsuarios.accion, filtros.accion));
  if (filtros.desde) condiciones.push(gte(auditoriaUsuarios.creadaEn, fecha(filtros.desde)));
  if (filtros.hasta) condiciones.push(lt(auditoriaUsuarios.creadaEn, new Date(fecha(filtros.hasta).getTime() + 86400000)));
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) error(400, 'La fecha inicial debe ser anterior a la final');
  if (filtros.q) {
    const buscar = `%${filtros.q.replace(/[\\%_]/g, '\\$&')}%`;
    condiciones.push(sql`concat_ws(' ', ${auditoriaUsuarios.accion}, ${auditoriaUsuarios.detalle}::text,
      (select nombre from usuarios where id = ${auditoriaUsuarios.actorId}),
      (select nombre from usuarios where id = ${auditoriaUsuarios.usuarioObjetivoId})) ilike ${buscar}`);
  }
  const where = and(...condiciones);
  const [conteo] = await db.select({ total: count() }).from(auditoriaUsuarios).where(where);
  const total = conteo.total, paginas = Math.max(1, Math.ceil(total / 25));
  const solicitada = Number(url.searchParams.get('pagina') ?? 1);
  const pagina = Math.min(paginas, Math.max(1, Number.isSafeInteger(solicitada) ? solicitada : 1));
  const acciones = await db.selectDistinct({ accion: auditoriaUsuarios.accion }).from(auditoriaUsuarios).orderBy(auditoriaUsuarios.accion);
  const eventos = await db.select().from(auditoriaUsuarios)
    .where(where).orderBy(desc(auditoriaUsuarios.creadaEn), desc(auditoriaUsuarios.id)).limit(25).offset((pagina - 1) * 25);
  const ids = [...new Set(eventos.flatMap(e => [e.actorId, e.usuarioObjetivoId]).filter((id): id is string => !!id))];
  const personas = ids.length ? await db.select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios).where(inArray(usuarios.id, ids)) : [];
  const nombres = new Map(personas.map(u => [u.id, u.nombre]));
  return { filtros, pagina, paginas, total, acciones: acciones.map(a => a.accion), eventos: eventos.map(e => ({ ...e,
    actorNombre: e.actorId ? nombres.get(e.actorId) ?? 'Usuario no disponible' : nombreArchivado(e.detalle, 'actorEliminado') ?? 'Cuenta no disponible',
    objetivoNombre: e.usuarioObjetivoId ? nombres.get(e.usuarioObjetivoId) ?? 'Usuario no disponible' : nombreArchivado(e.detalle, 'usuarioEliminado')
  })) };
};
