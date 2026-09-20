import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, departamentos, usuarios, rolUsuario } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';

export type Admin = NonNullable<App.Locals['user']>;

export function exigirAdmin(user: App.Locals['user']): Admin {
  if (!user || user.rol !== 'ADMIN') error(403, 'Acceso restringido a administración');
  return user;
}

export function campo(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

function validarEmail(value: string): string {
  const email = value.toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error(400, 'Correo inválido');
  return email;
}

function validarRol(value: string) {
  if (!rolUsuario.enumValues.some((r) => r === value)) error(400, 'Rol inválido');
  return value as (typeof rolUsuario.enumValues)[number];
}

async function validarDepartamento(id: string | null): Promise<string | null> {
  if (!id) return null;
  const [dep] = await db.select({ id: departamentos.id }).from(departamentos)
    .where(and(eq(departamentos.id, id), eq(departamentos.activo, true))).limit(1);
  if (!dep) error(400, 'Departamento inválido o inactivo');
  return id;
}

export async function crearUsuario(actor: Admin, form: FormData): Promise<void> {
  const nombre = campo(form, 'nombre');
  const email = validarEmail(campo(form, 'email'));
  const rol = validarRol(campo(form, 'rol'));
  const departamentoId = await validarDepartamento(campo(form, 'departamentoId') || null);
  const password = campo(form, 'password');
  if (!nombre || nombre.length > 160 || password.length < 12) error(400, 'Nombre o contraseña inválidos');
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(usuarios).values({ nombre, email, rol, departamentoId, passwordHash })
      .returning({ id: usuarios.id });
    await tx.insert(auditoriaUsuarios).values({
      actorId: actor.id, usuarioObjetivoId: created.id, accion: 'USUARIO_CREADO',
      detalle: { email, rol, departamentoId }
    });
  });
}

export async function actualizarUsuario(actor: Admin, form: FormData): Promise<void> {
  const id = campo(form, 'id');
  const nombre = campo(form, 'nombre');
  const rol = validarRol(campo(form, 'rol'));
  const departamentoId = await validarDepartamento(campo(form, 'departamentoId') || null);
  if (!id || !nombre || nombre.length > 160) error(400, 'Datos de usuario inválidos');
  if (id === actor.id && rol !== 'ADMIN') error(400, 'No puedes quitarte el rol de administrador');
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ id: usuarios.id, nombre: usuarios.nombre,
      rol: usuarios.rol, departamentoId: usuarios.departamentoId }).from(usuarios)
      .where(eq(usuarios.id, id)).limit(1);
    if (!before) error(404, 'Usuario inexistente');
    await tx.update(usuarios).set({ nombre, rol, departamentoId, actualizadoEn: new Date() })
      .where(eq(usuarios.id, id));
    await tx.insert(auditoriaUsuarios).values({
      actorId: actor.id, usuarioObjetivoId: id, accion: 'USUARIO_ACTUALIZADO',
      detalle: { antes: before, despues: { nombre, rol, departamentoId } }
    });
  });
}

export async function cambiarEstadoUsuario(actor: Admin, id: string, activo: boolean): Promise<void> {
  if (!id || (id === actor.id && !activo)) error(400, 'No puedes desactivar tu propia cuenta');
  await db.transaction(async (tx) => {
    const [found] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, id));
    if (!found) error(404, 'Usuario inexistente');
    await tx.update(usuarios).set({ activo, actualizadoEn: new Date() }).where(eq(usuarios.id, id));
    await tx.insert(auditoriaUsuarios).values({
      actorId: actor.id, usuarioObjetivoId: id,
      accion: activo ? 'USUARIO_ACTIVADO' : 'USUARIO_DESACTIVADO', detalle: {}
    });
  });
}

export async function crearDepartamento(actor: Admin, nombre: string): Promise<void> {
  if (!nombre || nombre.length > 120) error(400, 'Nombre de departamento inválido');
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(departamentos).values({ nombre }).returning({ id: departamentos.id });
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id,
      accion: 'DEPARTAMENTO_CREADO', detalle: { id: created.id, nombre } });
  });
}

export async function actualizarDepartamento(actor: Admin, id: string, nombre: string, activo: boolean): Promise<void> {
  if (!id || !nombre || nombre.length > 120) error(400, 'Datos de departamento inválidos');
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(departamentos).where(eq(departamentos.id, id)).limit(1);
    if (!before) error(404, 'Departamento inexistente');
    await tx.update(departamentos).set({ nombre, activo }).where(eq(departamentos.id, id));
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id,
      accion: 'DEPARTAMENTO_ACTUALIZADO', detalle: { id, antes: { nombre: before.nombre, activo: before.activo },
        despues: { nombre, activo } } });
  });
}
