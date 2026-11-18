import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, canjes, departamentos, tareas, usuarios, rolUsuario, sesiones } from '$lib/server/db/schema';
import { autenticar, hashPassword } from '$lib/server/auth';
import { borrarFoto } from '$lib/server/perfil';

export type Admin = NonNullable<App.Locals['user']>;

export function exigirAdmin(user: App.Locals['user']): Admin {
  if (!user || user.rol !== 'ADMIN') error(403, 'Acceso restringido a administración');
  return user;
}

export function campo(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

export async function restablecerPassword(actor: Admin, form: FormData) {
  exigirAdmin(actor);
  const id = campo(form, 'id');
  const nueva = String(form.get('nueva') ?? '');
  const confirmacion = String(form.get('confirmacion') ?? '');
  const actual = String(form.get('passwordAdmin') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || nueva.length < 12 || nueva.length > 128 || nueva !== confirmacion) error(400, 'Revisa la cuenta y confirma una contraseña de 12 a 128 caracteres');
  if (!actual || actual.length > 1024) error(400, 'Confirma con tu contraseña de administrador');
  const [admin] = await db.select().from(usuarios).where(eq(usuarios.id, actor.id));
  const validado = admin && await autenticar(admin.email, actual);
  if (!validado || validado.rol !== 'ADMIN') error(403, 'No se pudo verificar tu contraseña de administrador');
  const passwordHash = await hashPassword(nueva);
  await db.transaction(async tx => {
    const cuentas = await tx.select().from(usuarios).where(inArray(usuarios.id, [actor.id, id])).orderBy(asc(usuarios.id)).for('update');
    const vigente = cuentas.find(u => u.id === actor.id);
    const objetivo = cuentas.find(u => u.id === id);
    if (!vigente?.activo || vigente.rol !== 'ADMIN' || vigente.passwordHash !== validado.passwordHash) error(403, 'Vuelve a iniciar sesión como administrador');
    if (!objetivo?.activo || objetivo.rol === 'ADMIN') error(400, 'Solo se restablecen cuentas activas de miembros y encargados');
    await tx.update(usuarios).set({ passwordHash, intentosFallidos: 0, bloqueadoHasta: null, actualizadoEn: new Date() }).where(eq(usuarios.id, id));
    await tx.delete(sesiones).where(eq(sesiones.usuarioId, id));
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, usuarioObjetivoId: id, accion: 'PASSWORD_RESTABLECIDA', detalle: { sesionesRevocadas: true } });
  });
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

export async function eliminarUsuario(actor: Admin, id: string, confirmacionEmail: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) error(400, 'Identificador de usuario inválido');
  if (id === actor.id) error(400, 'No puedes eliminar tu propia cuenta');
  const foto = await db.transaction(async (tx) => {
    // Orden estable: también impide que dos administradores se eliminen mutuamente.
    const cuentas = await tx.select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email,
      rol: usuarios.rol, activo: usuarios.activo, fotoPerfil: usuarios.fotoPerfil }).from(usuarios)
      .where(inArray(usuarios.id, [actor.id, id])).orderBy(asc(usuarios.id)).for('update');
    const administrador = cuentas.find(u => u.id === actor.id);
    if (!administrador?.activo || administrador.rol !== 'ADMIN') error(403, 'Tu cuenta ya no tiene permisos de administración');
    const objetivo = cuentas.find(u => u.id === id);
    if (!objetivo) error(404, 'La cuenta ya no existe');
    if (confirmacionEmail.trim().toLowerCase() !== objetivo.email.toLowerCase()) error(400, 'Escribe el correo de la cuenta para confirmar la eliminación');
    const [pendiente] = await tx.select({ id: tareas.id }).from(tareas).where(and(
      ne(tareas.estado, 'TERMINADA'), or(eq(tareas.responsableId, id), eq(tareas.revisorId, id))
    )).limit(1);
    if (pendiente) error(400, 'Esta cuenta tiene tareas pendientes como responsable o revisor. Reasígnalas o finalízalas antes de eliminarla. Puedes desactivar la cuenta mientras tanto.');
    const [canje] = await tx.select({ id: canjes.id }).from(canjes)
      .where(and(eq(canjes.usuarioId, id), eq(canjes.estado, 'PENDIENTE'))).limit(1);
    if (canje) error(400, 'Esta cuenta tiene canjes pendientes. Entrégalos o cancélalos antes de eliminarla.');
    // Las FK conservan tareas/mensajes/adjuntos y anulan su referencia al usuario.
    // Sesiones y datos personales de gamificación se eliminan en cascada.
    const identidad = { id: objetivo.id, nombre: objetivo.nombre, email: objetivo.email, rol: objetivo.rol };
    // Conserva la identidad auditable antes de que las FK se pongan a null.
    await tx.update(auditoriaUsuarios).set({ detalle: sql`${auditoriaUsuarios.detalle} || ${JSON.stringify({ actorEliminado: identidad })}::jsonb` })
      .where(eq(auditoriaUsuarios.actorId, id));
    await tx.update(auditoriaUsuarios).set({ detalle: sql`${auditoriaUsuarios.detalle} || ${JSON.stringify({ usuarioEliminado: identidad })}::jsonb` })
      .where(eq(auditoriaUsuarios.usuarioObjetivoId, id));
    await tx.delete(usuarios).where(eq(usuarios.id, id));
    await tx.insert(auditoriaUsuarios).values({ actorId: actor.id, accion: 'USUARIO_ELIMINADO',
      detalle: { usuarioEliminado: identidad } });
    return objetivo.fotoPerfil;
  });
  await borrarFoto(foto);
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
