import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { departamentos, usuarios } from '$lib/server/db/schema';

export function exigirEncargadoEquipo(user: App.Locals['user']) {
  if (!user || user.rol !== 'ENCARGADO') error(403, 'Acceso restringido a encargados');
  return user;
}

export async function obtenerIntegranteEquipo(user: App.Locals['user'], id: string) {
  const actor = exigirEncargadoEquipo(user);
  if (!actor.departamentoId) error(403, 'Necesitas un departamento asignado');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    error(404, 'Perfil no disponible');
  }

  const [integrante] = await db.select({
    id: usuarios.id,
    nombre: usuarios.nombre,
    rol: usuarios.rol,
    foto: usuarios.fotoPerfil,
    departamento: departamentos.nombre
  }).from(usuarios)
    .innerJoin(departamentos, eq(departamentos.id, usuarios.departamentoId))
    .where(and(eq(usuarios.id, id), eq(usuarios.departamentoId, actor.departamentoId), eq(usuarios.activo, true)));

  if (!integrante) error(404, 'Perfil no disponible');
  return integrante;
}
