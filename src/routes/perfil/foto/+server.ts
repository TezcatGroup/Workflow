import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leerFoto } from '$lib/server/perfil';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) error(401, 'Inicia sesión para ver tu foto');
  if (locals.user.rol === 'ADMIN') error(403, 'Los ajustes de perfil no están disponibles para administradores');
  const foto = await leerFoto(locals.user.fotoPerfil);
  return new Response(new Uint8Array(foto), { headers: {
    'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"
  } });
};
