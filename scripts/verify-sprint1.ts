import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import { auditoriaUsuarios, departamentos, usuarios } from '../src/lib/server/db/schema';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL;
if (!adminEmail || !adminPassword || !url) throw new Error('Faltan variables de entorno.');
const client = postgres(url);
const db = drizzle(client);
const suffix = randomBytes(4).toString('hex');
const memberPassword = `Tezcat-${suffix}-Segura-2026`;
const results: string[] = [];

async function request(path: string, options: RequestInit = {}) {
  return fetch(new URL(path, base), { redirect: 'manual', ...options });
}

async function login(email: string, password: string) {
  const res = await request('/login', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html', origin: base },
    body: new URLSearchParams({ email, password })
  });
  return res;
}

function cookie(res: Response) {
  const setCookie = res.headers.get('set-cookie') ?? '';
  return { setCookie, value: setCookie.split(';')[0] };
}

async function action(path: string, name: string, values: Record<string, string>, token: string) {
  return request(`${path}?/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html',
      origin: base, cookie: token }, body: new URLSearchParams(values)
  });
}

function passed(id: string, detail: string) { results.push(`${id} APROBADO: ${detail}`); }

try {
  const adminLogin = await login(adminEmail, adminPassword);
  const adminCookie = cookie(adminLogin);
  assert.equal(adminLogin.status, 303);
  assert.match(adminCookie.setCookie, /HttpOnly/i);
  assert.match(adminCookie.setCookie, /SameSite=Lax/i);
  const adminDashboard = await request('/dashboard', { headers: { cookie: adminCookie.value } });
  assert.equal(adminDashboard.status, 200);
  const adminHtml = await adminDashboard.text();
  assert.match(adminHtml, /ADMIN/);
  assert.match(adminHtml, /departamentos/);
  passed('TC-01', 'login, sesión HttpOnly/SameSite y dashboard');

  const depName = `Pruebas ${suffix}`;
  const depCreate = await action('/admin/departamentos', 'crear', { nombre: depName }, adminCookie.value);
  assert.ok(depCreate.status < 400, `crear departamento: ${depCreate.status}`);
  const [dep] = await db.select().from(departamentos).where(eq(departamentos.nombre, depName));
  assert.ok(dep);
  const depRename = await action('/admin/departamentos', 'actualizar', {
    id: dep.id, nombre: `${depName} actualizado`, activo: 'true'
  }, adminCookie.value);
  assert.ok(depRename.status < 400, `editar departamento: ${depRename.status}`);
  const [renamed] = await db.select().from(departamentos).where(eq(departamentos.id, dep.id));
  assert.equal(renamed.nombre, `${depName} actualizado`);
  const memberEmail = `miembro-${suffix}@tezcat.local`;
  const memberCreate = await action('/admin/usuarios', 'crear', {
    nombre: 'Miembro de prueba', email: memberEmail, password: memberPassword,
    rol: 'MIEMBRO', departamentoId: dep.id
  }, adminCookie.value);
  assert.ok(memberCreate.status < 400, `crear usuario: ${memberCreate.status}`);
  const [member] = await db.select().from(usuarios).where(eq(usuarios.email, memberEmail));
  assert.ok(member);
  const update = await action('/admin/usuarios', 'actualizar', {
    id: member.id, nombre: 'Miembro actualizado', rol: 'MIEMBRO', departamentoId: dep.id
  }, adminCookie.value);
  assert.ok(update.status < 400, `actualizar usuario: ${update.status}`);
  const [updated] = await db.select().from(usuarios).where(eq(usuarios.id, member.id));
  assert.equal(updated.nombre, 'Miembro actualizado');
  const [audit] = await db.select().from(auditoriaUsuarios)
    .where(eq(auditoriaUsuarios.usuarioObjetivoId, member.id)).limit(1);
  assert.ok(audit);
  passed('TC-05', 'CRUD de usuario/departamento y auditoría persistida');

  const memberLogin = await login(memberEmail, memberPassword);
  assert.equal(memberLogin.status, 303);
  const memberCookie = cookie(memberLogin).value;
  const forbidden = await action('/admin/departamentos', 'crear', {
    nombre: `Prohibido ${suffix}`
  }, memberCookie);
  assert.equal(forbidden.status, 303);
  const [forbiddenDep] = await db.select().from(departamentos)
    .where(eq(departamentos.nombre, `Prohibido ${suffix}`));
  assert.equal(forbiddenDep, undefined);
  passed('TC-06', 'MIEMBRO no puede ejecutar acción de administración');

  const memberDashboard = await request('/dashboard', { headers: { cookie: memberCookie } });
  assert.equal(memberDashboard.status, 200);
  const memberHtml = await memberDashboard.text();
  assert.match(memberHtml, /MIEMBRO/);
  assert.doesNotMatch(memberHtml, /departamentos.*usuarios/i);
  const anonymousDashboard = await request('/dashboard');
  assert.equal(anonymousDashboard.status, 303);
  passed('TC-08', 'dashboard de miembro y redirección de anónimo');

  const logout = await request('/logout', { method: 'POST', headers: { origin: base, cookie: memberCookie } });
  assert.equal(logout.status, 303);
  const reused = await request('/dashboard', { headers: { cookie: memberCookie } });
  assert.equal(reused.status, 303);
  passed('TC-03', 'logout invalida token en base de datos');

  const memberAgain = await login(memberEmail, memberPassword);
  assert.equal(memberAgain.status, 303);
  const activeCookie = cookie(memberAgain).value;
  const deactivate = await action('/admin/usuarios', 'estado', { id: member.id, activo: 'false' }, adminCookie.value);
  assert.ok(deactivate.status < 400);
  const deactivatedAccess = await request('/dashboard', { headers: { cookie: activeCookie } });
  assert.equal(deactivatedAccess.status, 303);
  passed('TC-04', 'cuenta inactiva pierde acceso aun con cookie vigente');

  const lockEmail = `bloqueo-${suffix}@tezcat.local`;
  const lockCreate = await action('/admin/usuarios', 'crear', {
    nombre: 'Bloqueo de prueba', email: lockEmail, password: memberPassword,
    rol: 'MIEMBRO', departamentoId: dep.id
  }, adminCookie.value);
  assert.ok(lockCreate.status < 400);
  for (let i = 0; i < 5; i++) assert.equal((await login(lockEmail, 'incorrecta')).status, 400);
  const [locked] = await db.select().from(usuarios).where(eq(usuarios.email, lockEmail));
  assert.ok(locked.bloqueadoHasta && locked.bloqueadoHasta > new Date());
  assert.equal((await login(lockEmail, memberPassword)).status, 400);
  passed('TC-02', 'bloqueo temporal tras cinco intentos fallidos');

  const managerEmail = `encargado-${suffix}@tezcat.local`;
  const managerCreate = await action('/admin/usuarios', 'crear', {
    nombre: 'Encargado de prueba', email: managerEmail, password: memberPassword,
    rol: 'ENCARGADO', departamentoId: dep.id
  }, adminCookie.value);
  assert.ok(managerCreate.status < 400);
  const managerLogin = await login(managerEmail, memberPassword);
  assert.equal(managerLogin.status, 303);
  const managerDashboard = await request('/dashboard', { headers: { cookie: cookie(managerLogin).value } });
  assert.equal(managerDashboard.status, 200);
  const managerHtml = await managerDashboard.text();
  assert.match(managerHtml, /ENCARGADO/);
  assert.match(managerHtml, /miembrosActivos/);
  const [departmentCount] = await db.select({ total: sql<number>`count(*)::int` }).from(usuarios)
    .where(and(eq(usuarios.departamentoId, dep.id), eq(usuarios.activo, true)));
  assert.match(managerHtml, new RegExp(`${departmentCount.total}\\s+miembrosActivos`));
  assert.doesNotMatch(managerHtml, /Auditoría administrativa/);
  passed('TC-07', 'ADMIN y ENCARGADO reciben widgets y métricas diferenciadas');

  console.log(results.join('\n'));
  console.log(`TOTAL: ${results.length}/8 APROBADOS`);
} catch (error) {
  console.error(results.join('\n'));
  console.error('FALLO:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
