import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { googleConfig, GOOGLE_FLOW_COOKIE, validarFlujoGoogle, intercambiarCodigoGoogle, validarTokenGoogle } from '$lib/server/google-oauth';
import { accederConGoogle } from '$lib/server/google-login';

export const GET: RequestHandler = async ({ cookies, url, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  const flowCookie = cookies.get(GOOGLE_FLOW_COOKIE);
  cookies.delete(GOOGLE_FLOW_COOKIE, { path: '/login/google' });
  const config = googleConfig(env);
  if (!config || url.origin !== config.origin) redirect(303, '/login?google=unavailable');
  let destino: string;
  try {
    if (!flowCookie) throw new Error('Falta flujo');
    const flow = await validarFlujoGoogle(flowCookie, url.searchParams.get('state') ?? '', config);
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code || code.length > 4096) throw new Error('Autorización incompleta');
    const token = await intercambiarCodigoGoogle(code, flow.verifier, config);
    const identity = await validarTokenGoogle(token, config, flow.nonce);
    destino = await accederConGoogle(identity, cookies, config.secure);
  } catch {
    // Nunca exponer códigos, tokens, datos de Google ni existencia de cuentas en logs/URL.
    redirect(303, '/login?google=denied');
  }
  redirect(303, destino);
};
