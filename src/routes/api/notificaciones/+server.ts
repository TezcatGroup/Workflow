import { json, type RequestHandler } from '@sveltejs/kit';
import * as notifService from '$lib/server/notificaciones';

export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;
  if (!user || user.rol === 'ADMIN') {
    return json({ noLeidas: 0, notificaciones: [] });
  }

  try {
    if (typeof notifService.asegurarSchedulerActivo === 'function') {
      notifService.asegurarSchedulerActivo();
    }
    const datos = await notifService.listarNotificacionesUsuarioBD(user.id, 20);
    return json(datos);
  } catch (err) {
    console.error('[API Notificaciones GET]:', err);
    return json({ noLeidas: 0, notificaciones: [] });
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = locals.user;
  if (!user || user.rol === 'ADMIN') {
    return json({ ok: false, noLeidas: 0, notificaciones: [] });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      notificacionId?: string;
      todas?: boolean;
    };

    if (body.todas) {
      await notifService.marcarTodasLeidasBD(user.id);
    } else if (body.notificacionId) {
      await notifService.marcarNotificacionLeidaBD(user.id, body.notificacionId);
    }

    const datos = await notifService.listarNotificacionesUsuarioBD(user.id, 20);
    return json({ ok: true, ...datos });
  } catch (err) {
    console.error('[API Notificaciones POST]:', err);
    return json({ ok: false, noLeidas: 0, notificaciones: [] }, { status: 500 });
  }
};