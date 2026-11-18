import { fail, isHttpError } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listarProyectos, guardarProyecto } from '$lib/server/proyectos';
export const load: PageServerLoad = ({ locals }) => listarProyectos(locals.user);
const guardar = (editar: boolean): Actions[string] => async ({ locals, request }) => {
  try { await guardarProyecto(locals.user, await request.formData(), editar); return { ok: editar ? 'Proyecto actualizado.' : 'Proyecto creado.' }; }
  catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message }); throw e; }
};
export const actions: Actions = { crear: guardar(false), actualizar: guardar(true) };
