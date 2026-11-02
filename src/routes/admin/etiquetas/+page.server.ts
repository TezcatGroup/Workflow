import { fail, type Actions } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos, etiquetas } from '$lib/server/db/schema';
import { campo, exigirAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  return { departamentos: await db.select().from(departamentos).orderBy(asc(departamentos.nombre)), etiquetas: await db.select().from(etiquetas).orderBy(asc(etiquetas.nombre)) };
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function guardar(form: FormData, editar: boolean) {
  const nombre = campo(form, 'nombre').trim();
  const categoria = campo(form, 'categoria');
  const departamentoId = campo(form, 'departamentoId');
  const id = campo(form, 'id');
  if (!nombre || nombre.length > 60) return fail(400, { error: 'El nombre debe tener entre 1 y 60 caracteres.' });
  if (categoria !== 'LENGUAJE DE PROGRAMACIÓN' && categoria !== 'FRAMEWORK') return fail(400, { error: 'Categoría inválida.' });
  if (!uuid.test(departamentoId) || (editar && !uuid.test(id))) return fail(400, { error: 'Identificador inválido.' });
  const [dep] = await db.select().from(departamentos).where(eq(departamentos.id, departamentoId));
  if (!dep) return fail(400, { error: 'El departamento no existe.' });
  const valores: typeof etiquetas.$inferInsert = { nombre, categoria, departamentoId, activo: editar ? campo(form, 'activo') === 'true' : true };
  try {
    const [etiqueta] = editar
      ? await db.update(etiquetas).set(valores).where(eq(etiquetas.id, id)).returning()
      : await db.insert(etiquetas).values(valores).returning();
    if (!etiqueta) return fail(404, { error: 'La etiqueta no existe.' });
    return { ok: editar ? 'Etiqueta actualizada.' : 'Etiqueta creada.', etiqueta };
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if ((err.cause?.code ?? err.code) === '23505') return fail(400, { error: 'Ya existe una etiqueta con ese nombre en el departamento.' });
    throw e;
  }
}
export const actions: Actions = {
  crear: async ({ locals, request }) => { exigirAdmin(locals.user); return guardar(await request.formData(), false); },
  actualizar: async ({ locals, request }) => { exigirAdmin(locals.user); return guardar(await request.formData(), true); }
};
