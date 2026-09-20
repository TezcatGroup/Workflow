import { redirect, type RequestHandler } from '@sveltejs/kit';
import { cerrarSesion, COOKIE_NAME } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(COOKIE_NAME);
  if (token) await cerrarSesion(token, cookies);
  redirect(303, '/login');
};
