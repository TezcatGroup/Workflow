import { redirect, type Handle } from '@sveltejs/kit';
import { COOKIE_NAME, leerSesion } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(COOKIE_NAME);
  event.locals.user = token ? await leerSesion(token) : null;

  const ruta = event.url.pathname;
  const protegida = ruta === '/dashboard' || ruta.startsWith('/dashboard/') ||
    ruta === '/perfil' || ruta.startsWith('/perfil/') ||
    ruta === '/equipo' || ruta.startsWith('/equipo/') ||
    ruta === '/admin' || ruta.startsWith('/admin/');
  if (protegida && !event.locals.user) redirect(303, '/login');
  if ((ruta === '/admin' || ruta.startsWith('/admin/')) && event.locals.user?.rol !== 'ADMIN') {
    redirect(303, '/dashboard');
  }
  return resolve(event);
};
