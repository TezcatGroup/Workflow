import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import { campo } from '$lib/server/admin';
import { solicitarCanje } from '$lib/server/canjes';
import { cambiarPassword, exigirPerfilEditable, guardarFoto, quitarFoto } from '$lib/server/perfil';
import { COOKIE_NAME } from '$lib/server/auth';

import type { PageServerLoad } from './$types';
import { cargarPerfil } from '$lib/server/perfil-datos';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  return { user, ...await cargarPerfil(user) };
};

export const actions: Actions = {
  guardarFoto: async ({ locals, request }) => {
    const user = exigirPerfilEditable(locals.user);
    const foto = (await request.formData()).get('foto');
    if (!(foto instanceof File)) return fail(400, { error: 'Selecciona una imagen.', ajuste: 'foto' });
    try { await guardarFoto(user, foto); return { ok: 'Foto de perfil actualizada.', ajuste: 'foto' }; }
    catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message, ajuste: 'foto' }); throw e; }
  },
  quitarFoto: async ({ locals }) => {
    const user = exigirPerfilEditable(locals.user);
    await quitarFoto(user); return { ok: 'Foto de perfil eliminada.', ajuste: 'foto' };
  },
  cambiarPassword: async ({ locals, request, cookies }) => {
    const user = exigirPerfilEditable(locals.user);
    const form = await request.formData();
    try { await cambiarPassword(user, String(form.get('actual') ?? ''), String(form.get('nueva') ?? ''), String(form.get('confirmacion') ?? '')); }
    catch (e) { if (isHttpError(e)) return fail(e.status, { error: e.body.message, ajuste: 'password' }); throw e; }
    cookies.delete(COOKIE_NAME, { path: '/' });
    redirect(303, '/login?password=updated');
  },
  // TW-17 / TW-22: Acción transaccional para gastar puntos (monedas) en una recompensa del catálogo
  canjear: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const recompensaId = campo(form, 'recompensaId');

    if (!UUID.test(recompensaId)) {
      return fail(400, { error: 'La recompensa seleccionada no es válida.' });
    }

    try {
      const { nombre } = await solicitarCanje(user, recompensaId, 'perfil');

      return {
        ok: `¡Canje exitoso! Solicitaste "${nombre}". Queda pendiente de pago.`
      };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      const mensaje = e instanceof Error ? e.message : 'No fue posible procesar el canje.';
      return fail(400, { error: mensaje });
    }
  }
};
