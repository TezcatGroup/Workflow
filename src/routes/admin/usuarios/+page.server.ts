import { fail, isHttpError, type Actions } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos, usuarios } from '$lib/server/db/schema';
import { actualizarUsuario, cambiarEstadoUsuario, crearUsuario, eliminarUsuario, exigirAdmin, campo, restablecerPassword } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  return {
    usuarios: await db.select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email,
      rol: usuarios.rol, departamentoId: usuarios.departamentoId, activo: usuarios.activo })
      .from(usuarios).orderBy(asc(usuarios.nombre)),
    departamentos: await db.select({ id: departamentos.id, nombre: departamentos.nombre })
      .from(departamentos).where(eq(departamentos.activo, true)).orderBy(asc(departamentos.nombre))
  };
};

export const actions: Actions = {
  restablecerPassword: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    try { await restablecerPassword(actor, await request.formData()); return { ok: 'Contraseña restablecida y sesiones anteriores cerradas. Entrega la nueva contraseña a la persona por un medio privado; podrá cambiarla desde Perfil.' }; }
    catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message }); throw e; }
  },
  eliminar: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    const form = await request.formData();
    try {
      await eliminarUsuario(actor, campo(form, 'id'), campo(form, 'confirmacionEmail'));
      return { ok: 'Cuenta eliminada. Su acceso fue revocado y la operación quedó registrada en auditoría.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      return fail(500, { error: 'No se pudo eliminar la cuenta. Inténtalo de nuevo.' });
    }
  },
  crear: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    try { await crearUsuario(actor, await request.formData()); return { ok: 'Usuario creado.' }; }
    catch (e) { return fail(400, { error: e instanceof Error ? e.message : 'No se pudo crear el usuario.' }); }
  },
  actualizar: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    try { await actualizarUsuario(actor, await request.formData()); return { ok: 'Usuario actualizado.' }; }
    catch (e) { return fail(400, { error: e instanceof Error ? e.message : 'No se pudo actualizar el usuario.' }); }
  },
  estado: async ({ locals, request }) => {
    const actor = exigirAdmin(locals.user);
    const form = await request.formData();
    try {
      await cambiarEstadoUsuario(actor, campo(form, 'id'), campo(form, 'activo') === 'true');
      return { ok: 'Estado actualizado.' };
    } catch (e) { return fail(400, { error: e instanceof Error ? e.message : 'No se pudo cambiar el estado.' }); }
  }
};
