import { error, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, sesiones, usuarios } from '$lib/server/db/schema';
import { autenticar, hashPassword } from '$lib/server/auth';

type Actor = NonNullable<App.Locals['user']>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const directorio = path.resolve('uploads', 'avatars');
const nombreValido = /^[0-9a-f-]{36}\.webp$/;
export const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export function exigirPerfilEditable(user: App.Locals['user']): Actor {
  if (!user) redirect(303, '/login');
  if (user.rol !== 'ENCARGADO' && user.rol !== 'MIEMBRO') error(403, 'Los ajustes de perfil solo están disponibles para encargados y miembros');
  return user;
}

async function cuentaEditable(tx: Tx, actor: Actor) {
  const [cuenta] = await tx.select().from(usuarios).where(and(eq(usuarios.id, actor.id),
    eq(usuarios.activo, true), inArray(usuarios.rol, ['ENCARGADO', 'MIEMBRO']))).for('update');
  if (!cuenta) error(403, 'Tu cuenta ya no tiene permisos para modificar el perfil');
  return cuenta;
}

export async function borrarFoto(nombre: string | null) {
  if (nombre && nombreValido.test(nombre)) await unlink(path.join(directorio, nombre)).catch(() => {});
}

export async function guardarFoto(actor: Actor, archivo: File) {
  if (!archivo.size || archivo.size > MAX_FOTO_BYTES) error(400, 'Elige una imagen de hasta 2 MB');
  const buffer = Buffer.from(await archivo.arrayBuffer());
  let resultado: Buffer;
  try {
    const imagen = sharp(buffer, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const meta = await imagen.metadata();
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages ?? 1) > 1) {
      error(400, 'Usa una imagen JPG, PNG o WebP sin animación');
    }
    // Decodifica y vuelve a codificar: no conserva contenido original ni metadatos.
    resultado = await imagen.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
  } catch {
    error(400, 'No se pudo leer la imagen. Usa JPG, PNG o WebP sin animación, de hasta 2 MB y 16 megapíxeles');
  }
  const nombre = `${randomUUID()}.webp`;
  let anterior: string | null = null;
  try {
    await db.transaction(async tx => {
      const cuenta = await cuentaEditable(tx, actor);
      await mkdir(directorio, { recursive: true });
      await writeFile(path.join(directorio, nombre), resultado, { flag: 'wx', mode: 0o600 });
      await tx.update(usuarios).set({ fotoPerfil: nombre, actualizadoEn: new Date() }).where(eq(usuarios.id, actor.id));
      await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, usuarioObjetivoId: actor.id,
        accion: 'FOTO_PERFIL_ACTUALIZADA', detalle: {} });
      anterior = cuenta.fotoPerfil;
    });
  } catch (e) { await borrarFoto(nombre); throw e; }
  await borrarFoto(anterior);
}

export async function quitarFoto(actor: Actor) {
  const anterior = await db.transaction(async tx => {
    const cuenta = await cuentaEditable(tx, actor);
    await tx.update(usuarios).set({ fotoPerfil: null, actualizadoEn: new Date() }).where(eq(usuarios.id, actor.id));
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, usuarioObjetivoId: actor.id,
      accion: 'FOTO_PERFIL_ELIMINADA', detalle: {} });
    return cuenta.fotoPerfil;
  });
  await borrarFoto(anterior);
}

export async function leerFoto(nombre: string | null) {
  if (!nombre || !nombreValido.test(nombre)) error(404, 'No hay foto de perfil');
  try { return await readFile(path.join(directorio, nombre)); }
  catch { error(404, 'No hay foto de perfil'); }
}

export async function cambiarPassword(actor: Actor, actual: string, nueva: string, confirmacion: string) {
  if (!actual || actual.length > 1024) error(400, 'Introduce tu contraseña actual');
  if (nueva.length < 12 || nueva.length > 128) error(400, 'La nueva contraseña debe tener entre 12 y 128 caracteres');
  if (nueva !== confirmacion) error(400, 'La confirmación no coincide con la nueva contraseña');
  if (nueva === actual) error(400, 'Elige una contraseña diferente de la actual');
  const [cuenta] = await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, actor.id));
  const validada = cuenta && await autenticar(cuenta.email, actual);
  if (!validada) error(400, 'La contraseña actual es incorrecta o la cuenta está temporalmente bloqueada');
  const passwordHash = await hashPassword(nueva);
  await db.transaction(async tx => {
    const vigente = await cuentaEditable(tx, actor);
    if (vigente.passwordHash !== validada.passwordHash) error(409, 'La contraseña cambió durante la operación. Vuelve a intentarlo');
    await tx.update(usuarios).set({ passwordHash, actualizadoEn: new Date(), intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(usuarios.id, actor.id));
    await tx.delete(sesiones).where(eq(sesiones.usuarioId, actor.id));
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, usuarioObjetivoId: actor.id,
      accion: 'PASSWORD_CAMBIADA', detalle: {} });
  });
}
