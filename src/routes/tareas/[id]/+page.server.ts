import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { campo } from '$lib/server/admin';
import {
  cambiarEstado,
  obtenerDetalle,
  toggleCriterioBD,
  registrarArchivo,
  eliminarArchivoBD,
  agregarComentarioBD,
  eliminarTarea
} from '$lib/server/tareas';

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  const detalle = await obtenerDetalle(user, params.id);

  return {
    user,
    ...detalle
  };
};

export const actions: Actions = {
  cambiarEstado: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');
    const form = await request.formData();
    const nuevoEstado = campo(form, 'estado');

    try {
      await cambiarEstado(user, params.id, nuevoEstado);
      return { ok: 'Estado actualizado correctamente.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },
  

  toggleCriterio: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const criterioId = String(form.get('criterioId') ?? '');
    const modo = String(form.get('modo') ?? 'RESPONSABLE') === 'ENCARGADO' ? 'ENCARGADO' : 'RESPONSABLE';

    try {
      await toggleCriterioBD(user, params.id, criterioId, modo);
      return { ok: 'Criterio actualizado.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },

  subirArchivo: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const archivosForm = form
      .getAll('archivos')
      .filter((item): item is File => item instanceof File && item.size > 0);
    const enlaceUrl = String(form.get('enlaceUrl') ?? '').trim();
    const enlaceTitulo = String(form.get('enlaceTitulo') ?? '').trim();

    if (archivosForm.length === 0 && !enlaceUrl) {
      return fail(400, { error: 'Selecciona al menos un archivo o proporciona un enlace válido.' });
    }

    try {
      if (archivosForm.length > 0) {
        for (const f of archivosForm) {
          await registrarArchivo(user, params.id, f);
        }
      } else if (enlaceUrl) {
        await registrarArchivo(user, params.id, null, enlaceUrl, enlaceTitulo);
      }
      return { ok: 'Material adjuntado correctamente a la tarea.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },

  eliminarArchivo: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const archivoId = String(form.get('archivoId') ?? '');

    try {
      await eliminarArchivoBD(user, params.id, archivoId);
      return { ok: 'Archivo eliminado.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },

  comentar: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const contenido = String(form.get('contenido') ?? '');

    try {
      await agregarComentarioBD(user, params.id, contenido);
      return { ok: 'Comentario enviado.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },

  eliminarTarea: async ({ locals, params }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    try {
      await eliminarTarea(user, params.id);
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }

    // Redirigir a la bandeja principal de tareas tras la eliminación
    redirect(303, '/tareas');
  }
  
};