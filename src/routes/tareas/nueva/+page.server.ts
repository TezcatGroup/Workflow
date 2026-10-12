import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { crearTareaObligatoria, exigirEncargado, opcionesParaCrear } from '$lib/server/tareas';

/**
 * CONTRATO PARA EL FRONTEND
 *
 * data (load):
 *   user               { id, nombre, rol, departamentoId }
 *   responsables       [{ id, nombre, rol }]   usuarios activos del departamento
 *   proyectos          [{ id, nombre }]        proyectos activos del departamento
 *   prioridades        string[]                BAJA | MEDIA | ALTA | URGENTE
 *   dificultades       string[]                FACIL | INTERMEDIA | DIFICIL | EXPERTO
 *   prioridadPorDefecto / dificultadPorDefecto
 *
 * Acción ?/crear  (POST, application/x-www-form-urlencoded)
 *   campos: titulo*, descripcion, responsableId*, revisorId, fechaLimite* (YYYY-MM-DD),
 *           prioridad, dificultad, proyectoId, criterios (campo repetido, uno por criterio)
 *   éxito:  redirige (303) a /tareas/<id>
 *   error:  fail(status, { error: string, valores })  → `valores` trae lo que escribió la persona
 */
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

    let tareaId: string;
    try {
      tareaId = (await crearTareaObligatoria(encargado, form)).id;
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message, valores: valoresDelFormulario(form) });
      throw e;
    }
    // El redirect va fuera del try/catch: en SvelteKit también funciona lanzando una excepción.
    redirect(303, `/tareas/${tareaId}`);
  }
};
