import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import { leerFoto } from '$lib/server/perfil';
export const GET: RequestHandler = async ({ locals, params }) => {
  const actor = locals.user;
  if (!actor || actor.rol !== 'ENCARGADO' || !actor.departamentoId) error(403, 'Acceso restringido al equipo');
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) error(404, 'Foto no disponible');
  const [persona] = await db.select({ foto: usuarios.fotoPerfil }).from(usuarios).where(and(eq(usuarios.id, params.id), eq(usuarios.departamentoId, actor.departamentoId), eq(usuarios.activo, true)));
  if (!persona) error(404, 'Foto no disponible');
  return new Response(new Uint8Array(await leerFoto(persona.foto)), { headers: {
    'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"
  } });
};
