import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { comenzarGoogle, googleConfig, GOOGLE_FLOW_COOKIE } from '$lib/server/google-oauth';

export const GET: RequestHandler = async ({ cookies, url, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  const config = googleConfig(env);
  if (!config) redirect(303, '/login?google=unavailable');
  if (url.origin !== config.origin) redirect(303, '/login?google=origin');
  const flow = await comenzarGoogle(config);
  cookies.set(GOOGLE_FLOW_COOKIE, flow.cookie, { path: '/login/google', httpOnly: true,
    secure: config.secure, sameSite: 'lax', maxAge: flow.maxAge });
  redirect(303, flow.url);
};
