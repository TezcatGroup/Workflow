import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { crearTareaObligatoria, exigirEncargado, opcionesParaCrear, registrarArchivo } from '$lib/server/tareas';

export const load: PageServerLoad = async ({ locals }) => {
  const encargado = exigirEncargado(locals.user);
  return { user: encargado, ...(await opcionesParaCrear(encargado)) };
};

function valoresDelFormulario(form: FormData) {
  const texto = (nombre: string) => String(form.get(nombre) ?? '');
  return {
    titulo: texto('titulo'),
    descripcion: texto('descripcion'),
    responsableId: texto('responsableId'),
    revisorId: texto('revisorId'),
    fechaLimite: texto('fechaLimite'),
    prioridad: texto('prioridad'),
    dificultad: texto('dificultad'),
    proyectoId: texto('proyectoId'),
    criterios: form.getAll('criterios').map(String)
  };
}

export const actions: Actions = {
  crear: async ({ locals, request }) => {
    const encargado = exigirEncargado(locals.user);
    const form = await request.formData();

    const archivosSubidos = form
      .getAll('archivosGuia')
      .filter((item): item is File => item instanceof File && item.size > 0);

    const LIMITE_BYTES = 10 * 1024 * 1024;
    for (const archivo of archivosSubidos) {
      if (archivo.size > LIMITE_BYTES) {
        return fail(400, {
          error: `El archivo "${archivo.name}" supera el límite permitido de 10 MB.`,
          valores: valoresDelFormulario(form)
        });
      }
    }

    let tareaId: string;
    try {
      tareaId = (await crearTareaObligatoria(encargado, form)).id;

      // GUARDADO REAL EN POSTGRESQL Y DISCO (TW-08)
      if (archivosSubidos.length > 0) {
        for (const archivo of archivosSubidos) {
          await registrarArchivo(tareaId, encargado.id, archivo);
        }
      }
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message, valores: valoresDelFormulario(form) });
      throw e;
    }
    
    redirect(303, `/tareas/${tareaId}`);
  }
};