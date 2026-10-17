import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listarMisTareas, agregarComentarioBD, obtenerComentariosBD } from '$lib/server/tareas';

/**
 * CONTRATO PARA EL FRONTEND (Actualizado Sprint 5 - TW-09)
 *
 * data (load):
 *   user         { id, nombre, rol, departamentoId }
 *   puedeCrear   boolean  true si es ENCARGADO (mostrar botón hacia /tareas/nueva)
 *   tareas       [{ id, numero, titulo, estado, prioridad, dificultad, fechaLimite (Date),
 *                   responsableNombre, totalComentarios, comentariosRecientes }]
 *
 * Acción ?/enviarMensajeRapido (POST - TW-09)
 *   Permite enviar un mensaje directo a una tarea desde el Drawer/Chat flotante del listado.
 *   campos: tareaId*, contenido*
 * 
 * ubicacion: src>routes>tareas>+page.server.ts
 */
export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  const tareasBase = await listarMisTareas(user);

  // EXTRAER COMENTARIOS REALES DE BD (TW-09)
  const tareas = await Promise.all(tareasBase.map(async (t) => {
    const comentarios = await obtenerComentariosBD(t.id);
    return {
      ...t,
      totalComentarios: comentarios.length,
      comentariosRecientes: comentarios
    };
  }));

  return { user, puedeCrear: user.rol === 'ENCARGADO', tareas };
};

export const actions: Actions = {
  enviarMensajeRapido: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const tareaId = String(form.get('tareaId') ?? '').trim();
    const contenido = String(form.get('contenido') ?? '').trim();

    if (!tareaId || !contenido) {
      return fail(400, { error: 'El mensaje no puede estar vacío.' });
    }
    if (contenido.length > 2000) {
      return fail(400, { error: 'El mensaje no puede exceder 2000 caracteres.' });
    }

    // INSERCIÓN REAL EN BD (TW-09)
    await agregarComentarioBD(tareaId, user.id, contenido);

    return { ok: true, tareaId };
  }
};