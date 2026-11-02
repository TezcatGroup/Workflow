import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { departamentos, usuarios, sesiones, tareas, etiquetas, tareaEtiquetas, tareaEventos, tareaCriterios, movimientosXp, movimientosPuntos } from '../src/lib/server/db/schema';

// Integration test against a running local app; fixtures are removed in finally.
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria');
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
const suffix = randomBytes(6).toString('hex');
const deps: string[] = [], users: string[] = [], taskIds: string[] = [];
async function actor(rol: 'ADMIN' | 'ENCARGADO' | 'MIEMBRO', dep: string) {
  const [u] = await db.insert(usuarios).values({ nombre: `Prueba ${rol} ${suffix}`, email: `${randomBytes(6).toString('hex')}@muro.test`, passwordHash: 'test-no-login', rol, departamentoId: dep }).returning();
  users.push(u.id);
  const token = randomBytes(32).toString('hex');
  await db.insert(sesiones).values({ usuarioId: u.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiraEn: new Date(Date.now() + 3600000) });
  return { ...u, cookie: `tezcat_session=${token}` };
}
type Actor = Awaited<ReturnType<typeof actor>>;
async function post(path: string, action: string, a: Actor, fields: Record<string, string>) {
  return fetch(`${base}${path}?/${action}`, { method: 'POST', redirect: 'manual', headers: { accept: 'text/html', origin: base, cookie: a.cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) });
}
async function html(path: string, a: Actor) {
  const r = await fetch(base + path, { headers: { cookie: a.cookie }, redirect: 'manual' });
  assert.equal(r.status, 200, path);
  return r.text();
}
try {
  for (const name of ['A', 'B']) { const [dep] = await db.insert(departamentos).values({ nombre: `Muro-${suffix}-${name}` }).returning(); deps.push(dep.id); }
  const admin = await actor('ADMIN', deps[0]), encargado = await actor('ENCARGADO', deps[0]);
  const m1 = await actor('MIEMBRO', deps[0]), m2 = await actor('MIEMBRO', deps[0]);
  const otro = await actor('MIEMBRO', deps[1]), otroEncargado = await actor('ENCARGADO', deps[1]);
  const nombre = `Etiqueta-${suffix}`;
  const tagFields = { nombre, categoria: 'FRAMEWORK', departamentoId: deps[0] };
  assert.equal((await post('/admin/etiquetas', 'crear', admin, tagFields)).status, 200);
  const [tag] = await db.select().from(etiquetas).where(eq(etiquetas.nombre, nombre)); assert.ok(tag);
  assert.ok((await html('/admin/etiquetas', admin)).includes(nombre));
  assert.equal((await post('/admin/etiquetas', 'crear', admin, tagFields)).status, 400);
  assert.equal((await post('/admin/etiquetas', 'crear', m1, { ...tagFields, nombre: 'prohibida' })).status, 303);
  assert.equal((await post('/admin/etiquetas', 'actualizar', admin, { ...tagFields, id: tag.id, activo: 'false' })).status, 200);
  assert.ok(!(await html('/tareas/nueva', encargado)).includes(nombre));
  assert.equal((await post('/admin/etiquetas', 'actualizar', admin, { ...tagFields, id: tag.id, activo: 'true' })).status, 200);
  assert.ok((await html('/tareas/nueva', encargado)).includes(nombre));
  const fields = { titulo: `Opcional-${suffix}`, descripcion: 'Inicio\n' + 'Descripción completa. '.repeat(40) + 'FINAL-DESCRIPCION', tipo: 'OPCIONAL', xpOfrecido: '125', puntosOfrecidos: '35', fechaLimite: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), etiquetas: tag.id, criterios: 'Entregar resultado' };
  async function create(title: string) {
    assert.equal((await post('/tareas/nueva', 'crear', encargado, { ...fields, titulo: title })).status, 303);
    const [t] = await db.select().from(tareas).where(eq(tareas.titulo, title)); assert.ok(t); taskIds.push(t.id); return t;
  }
  const t = await create(fields.titulo);
  assert.equal(t.tipo, 'OPCIONAL'); assert.equal(t.responsableId, null);
  assert.equal((await db.select().from(tareaEtiquetas).where(eq(tareaEtiquetas.tareaId, t.id))).length, 1);
  const wall = await html('/muro', m1); assert.ok(wall.includes(t.titulo)); assert.ok(wall.includes('FINAL-DESCRIPCION'));
  assert.ok(!(await html('/muro', otro)).includes(t.titulo));
  assert.equal((await post('/muro', 'tomar', otro, { tareaId: t.id })).status, 409);
  assert.equal((await post('/muro', 'tomar', encargado, { tareaId: t.id })).status, 403);
  const race = await Promise.all([post('/muro', 'tomar', m1, { tareaId: t.id }), post('/muro', 'tomar', m2, { tareaId: t.id })]);
  assert.deepEqual(race.map(r => r.status).sort(), [303, 409]);
  const [taken] = await db.select().from(tareas).where(eq(tareas.id, t.id));
  const winner = taken.responsableId === m1.id ? m1 : m2;
  assert.ok((await html('/tareas', winner)).includes(t.titulo));
  assert.ok((await html(`/tareas/${t.id}`, winner)).includes('FINAL-DESCRIPCION'));
  assert.ok(!(await html('/muro', winner)).includes(t.titulo));
  assert.equal(t.xpOfrecido, 125); assert.equal(t.puntosOfrecidos, 35);
  const detail = await html(`/tareas/${t.id}`, winner);
  assert.ok(detail.includes(nombre)); assert.ok(detail.includes('125 EXP')); assert.ok(detail.includes('35 monedas'));
  for (const invalid of ['-1', '1.5', 'abc', '2147483648']) {
    assert.equal((await post('/tareas/nueva', 'crear', encargado, { ...fields, xpOfrecido: invalid })).status, 400);
    assert.equal((await post('/tareas/nueva', 'crear', encargado, { ...fields, puntosOfrecidos: invalid })).status, 400);
  }
  const path = `/tareas/${t.id}`;
  assert.equal((await post(path, 'cambiarEstado', winner, { estado: 'EN_PROCESO' })).status, 200);
  const [criterion] = await db.select().from(tareaCriterios).where(eq(tareaCriterios.tareaId, t.id));
  assert.equal((await post(path, 'toggleCriterio', winner, { criterioId: criterion.id })).status, 200);
  assert.equal((await post(path, 'cambiarEstado', winner, { estado: 'EN_REVISION' })).status, 200);
  assert.equal((await db.select().from(movimientosXp).where(eq(movimientosXp.tareaId, t.id))).length, 0);
  assert.equal((await post(path, 'cambiarEstado', winner, { estado: 'TERMINADA' })).status, 403);
  assert.equal((await post(path, 'toggleCriterio', encargado, { criterioId: criterion.id, modo: 'ENCARGADO' })).status, 200);
  const approvals = await Promise.all([post(path, 'cambiarEstado', encargado, { estado: 'TERMINADA' }), post(path, 'cambiarEstado', encargado, { estado: 'TERMINADA' })]);
  assert.equal(approvals.filter(r => r.status === 200).length, 1);
  const xp = await db.select().from(movimientosXp).where(eq(movimientosXp.tareaId, t.id));
  const coins = await db.select().from(movimientosPuntos).where(eq(movimientosPuntos.tareaId, t.id));
  assert.equal(xp.length, 1); assert.equal(coins.length, 1);
  assert.equal(xp[0].usuarioId, winner.id); assert.equal(coins[0].usuarioId, winner.id);
  assert.equal(xp[0].cantidad, 125); assert.equal(coins[0].cantidad, 35);
  const profile = await html('/perfil', winner);
  assert.ok(profile.includes('125 EXP')); assert.ok(profile.includes('35 monedas'));
  assert.ok(!(await html('/perfil', encargado)).includes('125 EXP'));
  const t2 = await create(`Convertir-${suffix}`);
  assert.equal((await post('/muro', 'convertir', m1, { tareaId: t2.id, responsableId: m1.id })).status, 403);
  assert.equal((await post('/muro', 'convertir', encargado, { tareaId: t2.id, responsableId: otro.id })).status, 400);
  assert.equal((await post('/muro', 'convertir', otroEncargado, { tareaId: t2.id, responsableId: otro.id })).status, 409);
  assert.equal((await post('/muro', 'convertir', encargado, { tareaId: t2.id, responsableId: m1.id })).status, 200);
  const [converted] = await db.select().from(tareas).where(eq(tareas.id, t2.id));
  assert.equal(converted.xpOfrecido, null); assert.equal(converted.puntosOfrecidos, null);
  const mandatoryDetail = await html(`/tareas/${t2.id}`, m1);
  assert.ok(!mandatoryDetail.includes('Etiquetas y recompensas'));
  assert.ok(!mandatoryDetail.includes('Recompensa por completar'));
  assert.ok(mandatoryDetail.includes(nombre));
  // Incluso registros antiguos con importes no deben generar recompensas.
  await db.update(tareas).set({ xpOfrecido: 125, puntosOfrecidos: 35 }).where(eq(tareas.id, t2.id));
  const mandatoryPath = `/tareas/${t2.id}`;
  assert.equal((await post(mandatoryPath, 'cambiarEstado', m1, { estado: 'EN_PROCESO' })).status, 200);
  const [mandatoryCriterion] = await db.select().from(tareaCriterios).where(eq(tareaCriterios.tareaId, t2.id));
  await post(mandatoryPath, 'toggleCriterio', m1, { criterioId: mandatoryCriterion.id });
  assert.equal((await post(mandatoryPath, 'cambiarEstado', m1, { estado: 'EN_REVISION' })).status, 200);
  await post(mandatoryPath, 'toggleCriterio', encargado, { criterioId: mandatoryCriterion.id, modo: 'ENCARGADO' });
  assert.equal((await post(mandatoryPath, 'cambiarEstado', encargado, { estado: 'TERMINADA' })).status, 200);
  assert.equal((await db.select().from(movimientosXp).where(eq(movimientosXp.tareaId, t2.id))).length, 0);
  assert.equal((await db.select().from(movimientosPuntos).where(eq(movimientosPuntos.tareaId, t2.id))).length, 0);
  assert.equal(converted.tipo, 'OBLIGATORIA'); assert.equal(converted.responsableId, m1.id);
  assert.equal((await post('/muro', 'tomar', m2, { tareaId: t2.id })).status, 409);
  assert.equal((await db.select().from(tareaEventos).where(eq(tareaEventos.tareaId, t2.id))).filter(e => e.tipo === 'TAREA_CONVERTIDA').length, 1);
  assert.equal((await post('/tareas/nueva', 'crear', encargado, { ...fields, tipo: 'OBLIGATORIA' })).status, 400);
  assert.equal((await post('/tareas/nueva', 'crear', otroEncargado, fields)).status, 400);
  const t3 = await create(`Carrera-conversion-${suffix}`);
  const mixedRace = await Promise.all([
    post('/muro', 'tomar', m2, { tareaId: t3.id }),
    post('/muro', 'convertir', encargado, { tareaId: t3.id, responsableId: m1.id })
  ]);
  assert.equal(mixedRace.filter(r => r.status === 409).length, 1);
  assert.equal((await db.select().from(tareaEventos).where(eq(tareaEventos.tareaId, t3.id))).length, 2);
  console.log('APROBADO: etiquetas persistentes, creación opcional, descripción completa, aislamiento, toma concurrente, conversión, permisos, recompensas y acreditación única al responsable.');
} finally {
  if (taskIds.length) await db.delete(tareas).where(inArray(tareas.id, taskIds));
  if (users.length) await db.delete(usuarios).where(inArray(usuarios.id, users));
  if (deps.length) await db.delete(departamentos).where(inArray(departamentos.id, deps));
  await client.end();
}
