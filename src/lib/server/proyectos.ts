import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { departamentos, proyectos, auditoriaUsuarios } from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';

export function gestorProyectos(user: App.Locals['user']) {
  if (!user || !['ADMIN', 'ENCARGADO'].includes(user.rol)) error(403, 'Solo administradores y encargados gestionan proyectos');
  if (user.rol === 'ENCARGADO' && !user.departamentoId) error(403, 'Necesitas un departamento asignado');
  return user;
}

export async function listarProyectos(user: App.Locals['user']) {
  const actor = gestorProyectos(user);
  return {
    user: actor,
    proyectos: await db.select().from(proyectos).where(actor.rol === 'ADMIN' ? undefined : eq(proyectos.departamentoId, actor.departamentoId!)).orderBy(asc(proyectos.nombre)),
    departamentos: await db.select().from(departamentos).where(actor.rol === 'ADMIN' ? undefined : eq(departamentos.id, actor.departamentoId!)).orderBy(asc(departamentos.nombre))
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
