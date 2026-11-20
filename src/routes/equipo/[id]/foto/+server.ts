import type { RequestHandler } from './$types';
import { obtenerIntegranteEquipo } from '$lib/server/equipo';
import { leerFoto } from '$lib/server/perfil';

export const GET: RequestHandler = async ({ locals, params }) => {
  const persona = await obtenerIntegranteEquipo(locals.user, params.id);
  return new Response(new Uint8Array(await leerFoto(persona.foto)), { headers: {
    'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"
  } });
};
