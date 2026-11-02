import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { etiquetas, tareaEtiquetas, tareas, usuarios } from '$lib/server/db/schema';
import { asignarDesdeMuro } from '$lib/server/tareas';
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const user = locals.user;
  const disponibles = user.departamentoId ? await db.select({ tarea: tareas, encargado: usuarios.nombre }).from(tareas)
    .leftJoin(usuarios, eq(tareas.creadoPorId, usuarios.id))
    .where(and(eq(tareas.departamentoId, user.departamentoId), eq(tareas.tipo, 'OPCIONAL'), eq(tareas.estado, 'ASIGNADA'), isNull(tareas.responsableId))).orderBy(asc(tareas.fechaLimite)) : [];
  const relaciones = disponibles.length ? await db.select({ tareaId: tareaEtiquetas.tareaId, etiqueta: etiquetas }).from(tareaEtiquetas).innerJoin(etiquetas, eq(etiquetas.id, tareaEtiquetas.etiquetaId)).where(and(inArray(tareaEtiquetas.tareaId, disponibles.map(({ tarea }) => tarea.id)), eq(etiquetas.activo, true))) : [];
  const miembros = user.rol === 'ENCARGADO' && user.departamentoId ? await db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).where(and(eq(usuarios.departamentoId, user.departamentoId), eq(usuarios.rol, 'MIEMBRO'), eq(usuarios.activo, true))).orderBy(asc(usuarios.nombre)) : [];
  return { user, miembros, oportunidades: disponibles.map(({ tarea, encargado }) => ({ ...tarea, descripcion: tarea.descripcion ?? '', encargado: encargado ?? 'Encargado', fechaLimite: tarea.fechaLimite.toISOString(), etiquetas: relaciones.filter((r) => r.tareaId === tarea.id).map((r) => r.etiqueta) })) };
};
export const actions: Actions = {
  tomar: async ({ locals, request }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    let tarea;
    try { tarea = await asignarDesdeMuro(locals.user, String(form.get('tareaId') ?? '')); }
    catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message }); throw e; }
    redirect(303, '/tareas/' + tarea.id);
  },
  convertir: async ({ locals, request }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    try { await asignarDesdeMuro(locals.user, String(form.get('tareaId') ?? ''), String(form.get('responsableId') ?? '')); }
    catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message }); throw e; }
    return { ok: 'Tarea convertida en obligatoria y asignada al miembro seleccionado.' };
  }
};
