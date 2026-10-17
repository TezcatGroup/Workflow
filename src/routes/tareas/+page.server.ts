import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listarMisTareas, agregarComentarioBD } from '$lib/server/tareas';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // listarMisTareas ya incluye totalComentarios y comentariosRecientes en una sola consulta agrupada
  const tareas = await listarMisTareas(user);

  return { user, puedeCrear: user.rol === 'ENCARGADO', tareas };
};

export const actions: Actions = {
  enviarMensajeRapido: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const tareaId = String(form.get('tareaId') ?? '').trim();
    const contenido = String(form.get('contenido') ?? '').trim();

    try {
      await agregarComentarioBD(user, tareaId, contenido);
      return { ok: true, tareaId };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  }
};