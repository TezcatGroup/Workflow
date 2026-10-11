import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import {
  departamentos, movimientosPuntos, movimientosRama, movimientosXp,
  tareaCriterios, tareaEventos, tareas, usuarios
} from '../src/lib/server/db/schema';

// Pruebas del Sprint 4: creación (TW-04), avance de estado (TW-05) y detalle (TW-06) de
// tareas obligatorias. Requiere la app corriendo (pnpm dev) y las variables del .env.
// Uso: pnpm test:sprint4

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL;
if (!adminEmail || !adminPassword || !url) throw new Error('Faltan variables de entorno.');
const client = postgres(url);
const db = drizzle(client);
const suffix = randomBytes(4).toString('hex');
const password = `Tezcat-${suffix}-Segura-2026`;
const results: string[] = [];
const manana = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

async function request(path: string, options: RequestInit = {}) {
  return fetch(new URL(path, base), { redirect: 'manual', ...options });
}

async function login(email: string, pass: string) {
  return request('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html', origin: base },
    body: new URLSearchParams({ email, password: pass })
  });
}

function cookie(res: Response) {
  return (res.headers.get('set-cookie') ?? '').split(';')[0];
}

async function sesion(email: string) {
  const res = await login(email, password);
  assert.equal(res.status, 303, `login de ${email}`);
  return cookie(res);
}

/** Envía una acción de formulario. Acepta pares para poder repetir campos (criterios). */
async function accion(path: string, nombre: string, campos: [string, string][], token: string) {
  return request(`${path}?/${nombre}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html', origin: base, cookie: token },
    body: new URLSearchParams(campos)
  });
}

async function crearUsuario(adminCookie: string, nombre: string, rol: string, departamentoId: string) {
  const email = `${rol.toLowerCase()}-${nombre}-${suffix}@tezcat.local`;
  const res = await accion('/admin/usuarios', 'crear', [
    ['nombre', `${nombre} ${suffix}`], ['email', email], ['password', password],
    ['rol', rol], ['departamentoId', departamentoId]
  ], adminCookie);
  assert.ok(res.status < 400, `crear usuario ${nombre}: ${res.status}`);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  assert.ok(u, `usuario ${nombre} existe`);
  return { ...u, email };
}

function camposTarea(
  responsableId: string, titulo: string, extra: Record<string, string> = {}, criterios: string[] = []
): [string, string][] {
  const campos: Record<string, string> = { titulo, responsableId, fechaLimite: manana, ...extra };
  return [...Object.entries(campos), ...criterios.map((c): [string, string] => ['criterios', c])];
}

async function totalTareasDe(creadorId: string) {
  const [r] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas).where(eq(tareas.creadoPorId, creadorId));
  return r.total;
}

async function tareaPorTitulo(titulo: string) {
  const [t] = await db.select().from(tareas).where(eq(tareas.titulo, titulo));
  assert.ok(t, `tarea «${titulo}» existe`);
  return t;
}

async function estadoDe(id: string) {
  const [t] = await db.select({ estado: tareas.estado }).from(tareas).where(eq(tareas.id, id));
  return t.estado;
}

function passed(id: string, detalle: string) { results.push(`${id} APROBADO: ${detalle}`); }

try {
  /* ---------------- Preparación: departamentos y cuentas ---------------- */
  const adminCookie = cookie(await login(adminEmail, adminPassword));
  assert.ok(adminCookie, 'login del administrador');

  const nombreDepA = `Tareas A ${suffix}`;
  const nombreDepB = `Tareas B ${suffix}`;
  for (const nombre of [nombreDepA, nombreDepB]) {
    const res = await accion('/admin/departamentos', 'crear', [['nombre', nombre]], adminCookie);
    assert.ok(res.status < 400, `crear departamento ${nombre}`);
  }
  const [depA] = await db.select().from(departamentos).where(eq(departamentos.nombre, nombreDepA));
  const [depB] = await db.select().from(departamentos).where(eq(departamentos.nombre, nombreDepB));

  const encargado = await crearUsuario(adminCookie, 'jefe', 'ENCARGADO', depA.id);
  const responsable = await crearUsuario(adminCookie, 'responsable', 'MIEMBRO', depA.id);
  const ajeno = await crearUsuario(adminCookie, 'ajeno', 'MIEMBRO', depA.id);
  const otroDepto = await crearUsuario(adminCookie, 'otrodepto', 'MIEMBRO', depB.id);

  const cEncargado = await sesion(encargado.email);
  const cResponsable = await sesion(responsable.email);
  const cAjeno = await sesion(ajeno.email);
  const cOtroDepto = await sesion(otroDepto.email);

  /* ---------------- TC-09: creación válida (TW-04) ---------------- */
  const t1Titulo = `Tarea principal ${suffix}`;
  const creada = await accion('/tareas/nueva', 'crear',
    camposTarea(responsable.id, t1Titulo, { descripcion: 'Descripción de prueba' }, ['Criterio uno', '  Criterio dos  ', '', '   ']),
    cEncargado);
  assert.equal(creada.status, 303);
  const t1 = await tareaPorTitulo(t1Titulo);
  assert.equal(creada.headers.get('location'), `/tareas/${t1.id}`);
  assert.equal(t1.tipo, 'OBLIGATORIA');
  assert.equal(t1.estado, 'ASIGNADA');
  assert.equal(t1.xpOfrecido, null);
  assert.equal(t1.puntosOfrecidos, null);
  assert.equal(t1.prioridad, 'MEDIA');
  assert.equal(t1.dificultad, 'INTERMEDIA');
  assert.equal(t1.departamentoId, depA.id);
  assert.equal(t1.creadoPorId, encargado.id);
  assert.equal(t1.responsableId, responsable.id);
  assert.equal(t1.revisorId, encargado.id);
  const eventosCreacion = await db.select().from(tareaEventos)
    .where(and(eq(tareaEventos.tareaId, t1.id), eq(tareaEventos.tipo, 'TAREA_CREADA')));
  assert.equal(eventosCreacion.length, 1);
  assert.equal(eventosCreacion[0].actorId, encargado.id);
  passed('TC-09', 'el encargado crea una tarea OBLIGATORIA en estado ASIGNADA, sin XP ni puntos, con evento TAREA_CREADA');

  /* ---------------- TC-10: campos obligatorios y validaciones ---------------- */
  const antes = await totalTareasDe(encargado.id);
  const invalidas: Array<[string, [string, string][]]> = [
    ['sin título', camposTarea(responsable.id, '')],
    ['sin responsable', camposTarea('', `Sin responsable ${suffix}`)],
    ['sin fecha límite', camposTarea(responsable.id, `Sin fecha ${suffix}`, { fechaLimite: '' })],
    ['fecha pasada', camposTarea(responsable.id, `Fecha pasada ${suffix}`, { fechaLimite: '2020-01-01' })],
    ['prioridad inválida', camposTarea(responsable.id, `Prioridad mala ${suffix}`, { prioridad: 'CRITICA' })],
    ['dificultad inválida', camposTarea(responsable.id, `Dificultad mala ${suffix}`, { dificultad: 'IMPOSIBLE' })],
    ['título de más de 200 caracteres', camposTarea(responsable.id, 'x'.repeat(201))]
  ];
  for (const [caso, campos] of invalidas) {
    const res = await accion('/tareas/nueva', 'crear', campos, cEncargado);
    assert.equal(res.status, 400, `caso inválido: ${caso}`);
  }
  assert.equal(await totalTareasDe(encargado.id), antes, 'ninguna tarea inválida se guardó');
  passed('TC-10', 'se rechazan sin título, responsable o fecha límite, con fecha pasada y con valores fuera de catálogo');

  /* ---------------- TC-11: criterios como checklist ---------------- */
  const criterios = await db.select().from(tareaCriterios).where(eq(tareaCriterios.tareaId, t1.id));
  assert.deepEqual(criterios.map((c) => c.descripcion).sort(), ['Criterio dos', 'Criterio uno']);
  assert.ok(criterios.every((c) => c.completado === false));
  const demasiados = await accion('/tareas/nueva', 'crear',
    camposTarea(responsable.id, `Muchos criterios ${suffix}`, {}, Array.from({ length: 21 }, (_, i) => `c${i}`)),
    cEncargado);
  assert.equal(demasiados.status, 400);
  passed('TC-11', 'los criterios se guardan recortados y sin vacíos como checklist; más de 20 se rechaza');

  /* ---------------- TC-12: solo el encargado crea ---------------- */
  const antesMiembro = await totalTareasDe(responsable.id);
  const porMiembro = await accion('/tareas/nueva', 'crear', camposTarea(responsable.id, `Por miembro ${suffix}`), cResponsable);
  assert.equal(porMiembro.status, 403);
  assert.equal((await request('/tareas/nueva', { headers: { cookie: cResponsable } })).status, 403);
  assert.equal(await totalTareasDe(responsable.id), antesMiembro);
  const anonimo = await request('/tareas/nueva');
  assert.equal(anonimo.status, 303);
  passed('TC-12', 'un MIEMBRO no puede ver el formulario ni crear tareas (403) y un anónimo es redirigido');

  /* ---------------- TC-13: reglas de departamento y de personas ---------------- */
  const reglas: Array<[string, [string, string][]]> = [
    ['responsable de otro departamento', camposTarea(otroDepto.id, `Otro depto ${suffix}`)],
    ['responsable con identificador inválido', camposTarea('no-es-uuid', `Uuid malo ${suffix}`)],
    ['revisor igual al responsable', camposTarea(responsable.id, `Mismo revisor ${suffix}`, { revisorId: responsable.id })],
    ['proyecto inexistente', camposTarea(responsable.id, `Sin proyecto ${suffix}`, { proyectoId: UUID_INEXISTENTE })]
  ];
  for (const [caso, campos] of reglas) {
    assert.equal((await accion('/tareas/nueva', 'crear', campos, cEncargado)).status, 400, caso);
  }
  assert.equal(await totalTareasDe(encargado.id), antes, 'ninguna tarea con reglas rotas se guardó');
  passed('TC-13', 'se rechazan responsables de otro departamento, ids inválidos, revisor igual al responsable y proyectos inexistentes');

  /* ---------------- TC-14: avance de estado del responsable (TW-05) ---------------- */
  const rutaT1 = `/tareas/${t1.id}`;
  const iniciar = await accion(rutaT1, 'cambiarEstado', [['estado', 'EN_PROCESO']], cResponsable);
  assert.equal(iniciar.status, 200);
  assert.equal(await estadoDe(t1.id), 'EN_PROCESO');
  const enviar = await accion(rutaT1, 'cambiarEstado', [['estado', 'EN_REVISION']], cResponsable);
  assert.equal(enviar.status, 200);
  assert.equal(await estadoDe(t1.id), 'EN_REVISION');
  const cambios = await db.select().from(tareaEventos)
    .where(and(eq(tareaEventos.tareaId, t1.id), eq(tareaEventos.tipo, 'CAMBIO_ESTADO')));
  assert.deepEqual(
    cambios.map((c) => { const d = c.detalle as { de: string; a: string }; return `${d.de}>${d.a}`; }).sort(),
    ['ASIGNADA>EN_PROCESO', 'EN_PROCESO>EN_REVISION']
  );
  assert.ok(cambios.every((c) => c.actorId === responsable.id));
  passed('TC-14', 'el responsable avanza ASIGNADA → EN_PROCESO → EN_REVISION y cada cambio queda en el historial');

  /* ---------------- TC-15: transiciones y permisos restringidos ---------------- */
  const t2Titulo = `Tarea de transiciones ${suffix}`;
  assert.equal((await accion('/tareas/nueva', 'crear', camposTarea(responsable.id, t2Titulo), cEncargado)).status, 303);
  const t2 = await tareaPorTitulo(t2Titulo);
  const rutaT2 = `/tareas/${t2.id}`;
  for (const destino of ['TERMINADA', 'EN_REVISION', 'ASIGNADA', 'CANCELADA', 'inexistente']) {
    assert.equal((await accion(rutaT2, 'cambiarEstado', [['estado', destino]], cResponsable)).status, 400, `ASIGNADA → ${destino}`);
  }
  assert.equal(await estadoDe(t2.id), 'ASIGNADA');
  // En revisión, ni el responsable ni un ajeno pueden finalizar.
  assert.equal((await accion(rutaT1, 'cambiarEstado', [['estado', 'TERMINADA']], cResponsable)).status, 403);
  assert.equal((await accion(rutaT1, 'cambiarEstado', [['estado', 'TERMINADA']], cAjeno)).status, 403);
  // Un ajeno tampoco puede iniciar la tarea de otra persona.
  assert.equal((await accion(rutaT2, 'cambiarEstado', [['estado', 'EN_PROCESO']], cAjeno)).status, 403);
  assert.equal(await estadoDe(t1.id), 'EN_REVISION');
  assert.equal(await estadoDe(t2.id), 'ASIGNADA');
  passed('TC-15', 'transiciones inválidas (400) y cambios sin permiso (403) se rechazan en el servidor sin alterar el estado');

  /* ---------------- TC-16: permisos de lectura del detalle (TW-06) ---------------- */
  const vistaResponsable = await request(rutaT1, { headers: { cookie: cResponsable } });
  assert.equal(vistaResponsable.status, 200);
  const html = await vistaResponsable.text();
  assert.match(html, new RegExp(t1Titulo));
  assert.match(html, /Criterio uno/);
  assert.equal((await request(rutaT1, { headers: { cookie: cEncargado } })).status, 200);
  assert.equal((await request(rutaT1, { headers: { cookie: adminCookie } })).status, 200);
  assert.equal((await request(rutaT1, { headers: { cookie: cAjeno } })).status, 403);
  assert.equal((await request(rutaT1, { headers: { cookie: cOtroDepto } })).status, 403);
  assert.equal((await request(rutaT1)).status, 303);
  assert.equal((await request(`/tareas/${UUID_INEXISTENTE}`, { headers: { cookie: cEncargado } })).status, 404);
  assert.equal((await request('/tareas/abc', { headers: { cookie: cEncargado } })).status, 404);
  const listaResponsable = await (await request('/tareas', { headers: { cookie: cResponsable } })).text();
  assert.match(listaResponsable, new RegExp(t1Titulo));
  const listaAjeno = await (await request('/tareas', { headers: { cookie: cAjeno } })).text();
  assert.doesNotMatch(listaAjeno, new RegExp(t1Titulo));
  passed('TC-16', 'el detalle lo ven creador, responsable, encargado y admin; ajenos, otro departamento y anónimos no; la lista respeta el rol');

  /* ---------------- TC-17: revisión provisional y sin gamificación ---------------- */
  // Devolver una tarea en revisión (encargado) y volver a enviarla.
  const t3Titulo = `Tarea devuelta ${suffix}`;
  assert.equal((await accion('/tareas/nueva', 'crear', camposTarea(responsable.id, t3Titulo), cEncargado)).status, 303);
  const t3 = await tareaPorTitulo(t3Titulo);
  const rutaT3 = `/tareas/${t3.id}`;
  await accion(rutaT3, 'cambiarEstado', [['estado', 'EN_PROCESO']], cResponsable);
  await accion(rutaT3, 'cambiarEstado', [['estado', 'EN_REVISION']], cResponsable);
  assert.equal((await accion(rutaT3, 'cambiarEstado', [['estado', 'EN_PROCESO']], cEncargado)).status, 200);
  assert.equal(await estadoDe(t3.id), 'EN_PROCESO');

  // Finalizar T1 (encargado) y comprobar que TERMINADA es un estado final.
  assert.equal((await accion(rutaT1, 'cambiarEstado', [['estado', 'TERMINADA']], cEncargado)).status, 200);
  assert.equal(await estadoDe(t1.id), 'TERMINADA');
  assert.equal((await accion(rutaT1, 'cambiarEstado', [['estado', 'EN_PROCESO']], cEncargado)).status, 400);
  assert.equal(await estadoDe(t1.id), 'TERMINADA');
  const vistaFinal = await (await request(rutaT1, { headers: { cookie: cEncargado } })).text();
  assert.doesNotMatch(vistaFinal, /Marcar como terminada/);

  // Una tarea obligatoria no genera XP, puntos ni avance de rama.
  for (const [tabla, columna] of [
    ['movimientos_xp', movimientosXp.tareaId], ['movimientos_puntos', movimientosPuntos.tareaId], ['movimientos_rama', movimientosRama.tareaId]
  ] as const) {
    const tablaDrizzle = tabla === 'movimientos_xp' ? movimientosXp : tabla === 'movimientos_puntos' ? movimientosPuntos : movimientosRama;
    const [fila] = await db.select({ total: sql<number>`count(*)::int` }).from(tablaDrizzle).where(eq(columna, t1.id));
    assert.equal(fila.total, 0, `${tabla} sin movimientos para la tarea obligatoria`);
  }
  passed('TC-17', 'el encargado devuelve y finaliza en revisión; TERMINADA es final y la tarea obligatoria no genera XP, puntos ni rama');

  console.log(results.join('\n'));
  console.log(`TOTAL: ${results.length}/9 APROBADOS`);
} catch (error) {
  console.error(results.join('\n'));
  console.error('FALLO:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
