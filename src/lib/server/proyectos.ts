import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { departamentos, proyectos, auditoriaUsuarios, tareas } from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';

export function gestorProyectos(user: App.Locals['user']) {
  if (!user || !['ADMIN', 'ENCARGADO'].includes(user.rol)) error(403, 'Solo administradores y encargados gestionan proyectos');
  if (user.rol === 'ENCARGADO' && !user.departamentoId) error(403, 'Necesitas un departamento asignado');
  return user;
}

export async function listarProyectos(user: App.Locals['user']) {
  const actor = gestorProyectos(user);
  const esAdmin = actor.rol === 'ADMIN';
  const filtroProyectos = esAdmin ? undefined : eq(proyectos.departamentoId, actor.departamentoId!);
  const [lista, departamentosVisibles, tareasVinculadas] = await Promise.all([
    db.select().from(proyectos).where(filtroProyectos).orderBy(asc(proyectos.nombre)),
    db.select().from(departamentos).where(esAdmin ? undefined : eq(departamentos.id, actor.departamentoId!)).orderBy(asc(departamentos.nombre)),
    db.select({ id: tareas.id, titulo: tareas.titulo, estado: tareas.estado, proyectoId: proyectos.id })
      .from(tareas).innerJoin(proyectos, eq(proyectos.id, tareas.proyectoId))
      .where(esAdmin ? undefined : and(filtroProyectos, eq(tareas.departamentoId, actor.departamentoId!)))
      .orderBy(asc(tareas.titulo))
  ]);

  const porProyecto = new Map<string, Omit<(typeof tareasVinculadas)[number], 'proyectoId'>[]>();
  for (const { proyectoId, ...tarea } of tareasVinculadas) {
    const relacionadas = porProyecto.get(proyectoId);
    if (relacionadas) relacionadas.push(tarea);
    else porProyecto.set(proyectoId, [tarea]);
  }

  return {
    user: actor,
    proyectos: lista.map((p) => ({ ...p, tareas: porProyecto.get(p.id) ?? [] })),
    departamentos: departamentosVisibles
  };
}

export async function guardarProyecto(user: App.Locals['user'], form: FormData, editar: boolean) {
  const actor = gestorProyectos(user);
  const nombre = campo(form, 'nombre'), descripcion = campo(form, 'descripcion');
  const id = campo(form, 'id');
  const departamentoId = actor.rol === 'ADMIN' ? campo(form, 'departamentoId') : actor.departamentoId!;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!nombre || nombre.length > 160 || descripcion.length > 5000 || !uuid.test(departamentoId) || (editar && !uuid.test(id))) error(400, 'Revisa nombre, descripción y departamento');
  await db.transaction(async tx => {
    const [dep] = await tx.select().from(departamentos).where(eq(departamentos.id, departamentoId)).for('share');
    if (!dep || (!dep.activo && (!editar || campo(form, 'activo') === 'true'))) error(400, 'El departamento debe estar activo para crear o activar un proyecto');
    const despues = { nombre, descripcion, departamentoId, activo: editar ? campo(form, 'activo') === 'true' : true };
    if (editar) {
      const [antes] = await tx.select().from(proyectos).where(eq(proyectos.id, id)).for('update');
      if (!antes || (actor.rol !== 'ADMIN' && antes.departamentoId !== actor.departamentoId)) error(404, 'Proyecto no disponible');
      if (antes.departamentoId !== departamentoId) error(400, 'El departamento de un proyecto no puede cambiar; crea otro proyecto');
      await tx.update(proyectos).set({ ...despues, actualizadoEn: new Date() }).where(eq(proyectos.id, id));
      await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, accion: 'PROYECTO_ACTUALIZADO', detalle: { id, antes: { nombre: antes.nombre, descripcion: antes.descripcion, activo: antes.activo }, despues } });
    } else {
      const [nuevo] = await tx.insert(proyectos).values({ ...despues, creadoPorId: actor.id }).returning({ id: proyectos.id });
      await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, accion: 'PROYECTO_CREADO', detalle: { id: nuevo.id, ...despues } });
    }
  });
}
