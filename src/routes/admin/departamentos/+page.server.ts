import { fail, type Actions } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos } from '$lib/server/db/schema';
import { actualizarDepartamento, crearDepartamento, exigirAdmin, campo } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  return { departamentos: await db.select().from(departamentos).orderBy(asc(departamentos.nombre)) };
};

export const actions: Actions = {
  crear: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    try { await crearDepartamento(actor, campo(await request.formData(), 'nombre'));
      return { ok: 'Departamento creado.' }; }
    catch (e) { return fail(400, { error: e instanceof Error ? e.message : 'No se pudo crear.' }); }
  },
  actualizar: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    const form = await request.formData();
    try { await actualizarDepartamento(actor, campo(form, 'id'), campo(form, 'nombre'), campo(form, 'activo') === 'true');
      return { ok: 'Departamento actualizado.' }; }
    catch (e) { return fail(400, { error: e instanceof Error ? e.message : 'No se pudo actualizar.' }); }
  }
};
