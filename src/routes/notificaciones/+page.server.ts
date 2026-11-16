import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import * as notifService from '$lib/server/notificaciones';

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');
  if (user.rol === 'ADMIN') redirect(303, '/admin');

  if (typeof notifService.asegurarSchedulerActivo === 'function') {
    notifService.asegurarSchedulerActivo();
  }

  const seccion = url.searchParams.get('seccion') ?? 'TERMINADAS';
  const datos = await notifService.obtenerDatosCentroNotificacionesBD(user);

  return {
    user,
    seccionInicial: seccion,
    ...datos
  };
};

export const actions: Actions = {
  marcarLeida: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const id = String(form.get('notificacionId') ?? '');
    if (id) {
      await notifService.marcarNotificacionLeidaBD(user.id, id);
    }
    return { ok: true };
  },

  marcarTodasLeidas: async ({ locals }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    await notifService.marcarTodasLeidasBD(user.id);
    return { ok: true, mensaje: 'Todas tus notificaciones fueron marcadas como leídas.' };
  },

  ejecutarScheduler: async ({ locals }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const nuevas = await notifService.verificarVencimientosTareasBD(true);
    return {
      ok: true,
      mensaje:
        nuevas > 0
          ? `Se detectaron vencimientos próximos y se generaron ${nuevas} alerta(s) nueva(s).`
          : 'Revisión completada: todas las alertas de tareas por vencer están al día.'
    };
  }
};