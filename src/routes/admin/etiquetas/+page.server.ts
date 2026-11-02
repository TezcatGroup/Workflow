import { fail, type Actions } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos } from '$lib/server/db/schema';
import { campo, exigirAdmin } from '$lib/server/admin';

// ─────────────────────────────────────────────────────────────────────────────
// TW-14 · MODO MAQUETA: la tabla "etiquetas" aún no existe en la BD (pendiente
// del contrato del Sprint 7). Este load trae los departamentos REALES y un
// listado de etiquetas de ejemplo para maquetar la pantalla.
// TODO (contrato Sprint 7): cuando el backend cree la tabla, reemplazar el
// listado de ejemplo por db.select().from(etiquetas)... y el cuerpo de las
// acciones por crearEtiqueta / actualizarEtiqueta reales. La estructura,
// validaciones y permisos de aquí abajo ya quedan como referencia.
// ─────────────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);

  const deps = await db.select().from(departamentos).orderBy(asc(departamentos.nombre));

  // Etiquetas de ejemplo ancladas a un departamento real (si existe alguno).
  const dep = deps.find((d) => d.nombre.toLowerCase().includes('sistemas')) ?? deps[0];
  const ejemplo = dep
    ? [
        { id: 'ej-01', nombre: 'TypeScript', categoria: 'LENGUAJE DE PROGRAMACIÓN', departamentoId: dep.id, activo: true },
        { id: 'ej-02', nombre: 'Svelte', categoria: 'FRAMEWORK', departamentoId: dep.id, activo: true },
        { id: 'ej-03', nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN', departamentoId: dep.id, activo: false }
      ]
    : [];

  return { departamentos: deps, etiquetas: ejemplo };
};

export const actions: Actions = {
  crear: async ({ locals, request }) => {
    exigirAdmin(locals.user);
    const form = await request.formData();
    const nombre = campo(form, 'nombre').trim();
    const categoria = campo(form, 'categoria');
    const departamentoId = campo(form, 'departamentoId');

    if (!nombre) return fail(400, { error: 'El nombre de la etiqueta es obligatorio.' });
    if (!departamentoId) return fail(400, { error: 'Selecciona un departamento.' });
    if (categoria !== 'LENGUAJE DE PROGRAMACIÓN' && categoria !== 'FRAMEWORK') {
      return fail(400, { error: 'La categoría debe ser LENGUAJE DE PROGRAMACIÓN o FRAMEWORK.' });
    }

    // TODO (contrato Sprint 7): reemplazar por crearEtiqueta(actor, ...) real.
    return {
      ok: `Etiqueta «${nombre}» creada (modo maqueta: aún no se guarda en la base de datos).`,
      etiqueta: { id: crypto.randomUUID(), nombre, categoria, departamentoId, activo: true }
    };
  },

  actualizar: async ({ locals, request }) => {
    exigirAdmin(locals.user);
    const form = await request.formData();
    const id = campo(form, 'id');
    const nombre = campo(form, 'nombre').trim();
    const categoria = campo(form, 'categoria');
    const departamentoId = campo(form, 'departamentoId');
    const activo = campo(form, 'activo') === 'true';

    if (!nombre) return fail(400, { error: 'El nombre de la etiqueta es obligatorio.' });
    if (categoria !== 'LENGUAJE DE PROGRAMACIÓN' && categoria !== 'FRAMEWORK') {
      return fail(400, { error: 'La categoría no es válida.' });
    }

    // TODO (contrato Sprint 7): reemplazar por actualizarEtiqueta(actor, ...) real.
    return {
      ok: `Etiqueta «${nombre}» actualizada (modo maqueta).`,
      etiqueta: { id, nombre, categoria, departamentoId, activo }
    };
  }
};