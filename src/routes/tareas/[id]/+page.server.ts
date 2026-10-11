import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { campo } from '$lib/server/admin';
import { cambiarEstado, obtenerDetalle } from '$lib/server/tareas';

/**
 * CONTRATO PARA EL FRONTEND
 *
 * data (load):
 *   user                    { id, nombre, rol, departamentoId }
 *   tarea                   { id, numero, titulo, descripcion, tipo, estado, prioridad, dificultad,
 *                             fechaLimite (Date), creadoEn (Date), actualizadoEn (Date) }
 *   creador / responsable / revisor   { id, nombre } | null
 *   proyecto                { id, nombre } | null
 *   criterios               [{ id, descripcion, completado }]
 *   archivos                [{ id, nombre, mimeType, tamanoBytes }]   (vacío hasta TW-08)
 *   eventos                 [{ id, tipo, detalle, creadoEn, actorNombre }]  más reciente primero
 *                           tipo TAREA_CREADA | CAMBIO_ESTADO (detalle { de, a })
 *   transicionesPermitidas  string[]  estados a los que ESTA persona puede mover la tarea.
 *                           Vacío = no mostrar botones. Con esto no hay que repetir reglas en la vista.
 *
 * Acción ?/cambiarEstado  (POST)
 *   campos: estado*  (ASIGNADA | EN_PROCESO | EN_REVISION | TERMINADA)
 *   éxito:  { ok: string }  (la página se recarga sola con el estado nuevo)
 *   error:  fail(status, { error: string })   400 transición inválida, 403 sin permiso, 409 conflicto
 *
 * Errores de carga: 404 si la tarea no existe, 403 si no tiene acceso.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');
  return { user, ...(await obtenerDetalle(user, params.id)) };
};

export const actions: Actions = {
  cambiarEstado: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');
    const form = await request.formData();
    try {
      await cambiarEstado(user, params.id, campo(form, 'estado'));
      return { ok: 'Estado actualizado.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  }
};
