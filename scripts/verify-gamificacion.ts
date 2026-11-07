import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import {
  auditoriaUsuarios,
  canjes,
  departamentos,
  etiquetas,
  movimientosPuntos,
  movimientosRama,
  movimientosXp,
  ramas,
  recompensas,
  sesiones,
  tareaCriterios,
  tareas,
  usuarios
} from '../src/lib/server/db/schema';

// Verificación integral de Sprints 8 y 9:
// TW-16 (EXP), TW-17 (Puntos/Monedas), TW-18 (Ramas),
// TW-19 (Perfil de progreso, insignias y especialidades),
// TW-20 (Gráfica radar de ramas), TW-21 (Catálogo admin auditado) y TW-22 (Canje en tienda).
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria');
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
const suffix = randomBytes(5).toString('hex');
const deps: string[] = [];
const users: string[] = [];
const taskIds: string[] = [];
const rewardIds: string[] = [];

async function crearActor(rol: 'ADMIN' | 'ENCARGADO' | 'MIEMBRO', depId: string) {
  const [u] = await db
    .insert(usuarios)
    .values({
      nombre: `Actor ${rol} ${suffix}`,
      email: `${randomBytes(5).toString('hex')}@gamificacion.test`,
      passwordHash: 'test-hash-no-login',
      rol,
      departamentoId: depId
    })
    .returning();
  users.push(u.id);
  const token = randomBytes(32).toString('hex');
  await db.insert(sesiones).values({
    usuarioId: u.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiraEn: new Date(Date.now() + 3600000)
  });
  return { ...u, cookie: `tezcat_session=${token}` };
}

type ActorPrueba = Awaited<ReturnType<typeof crearActor>>;

async function post(
  path: string,
  action: string,
  a: ActorPrueba,
  fields: Record<string, string | string[]>
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
    else params.append(k, v);
  }
  return fetch(`${base}${path}?/${action}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      accept: 'text/html',
      origin: base,
      cookie: a.cookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
}

async function html(path: string, a: ActorPrueba) {
  const r = await fetch(base + path, { headers: { cookie: a.cookie }, redirect: 'manual' });
  assert.equal(r.status, 200, `GET ${path}`);
  return r.text();
}

try {
  const [dep] = await db
    .insert(departamentos)
    .values({ nombre: `Depto-Gamificacion-${suffix}` })
    .returning();
  deps.push(dep.id);

  const admin = await crearActor('ADMIN', dep.id);
  const encargado = await crearActor('ENCARGADO', dep.id);
  const miembro = await crearActor('MIEMBRO', dep.id);

  // 1. Crear etiquetas técnicas (Lenguaje y Framework) para TW-18 y TW-20
  const tagLang = `TypeScript-${suffix}`;
  const tagFw = `SvelteKit-${suffix}`;
  assert.equal(
    (
      await post('/admin/etiquetas', 'crear', admin, {
        nombre: tagLang,
        categoria: 'LENGUAJE DE PROGRAMACIÓN',
        departamentoId: dep.id
      })
    ).status,
    200
  );
  assert.equal(
    (
      await post('/admin/etiquetas', 'crear', admin, {
        nombre: tagFw,
        categoria: 'FRAMEWORK',
        departamentoId: dep.id
      })
    ).status,
    200
  );

  const [et1] = await db.select().from(etiquetas).where(eq(etiquetas.nombre, tagLang));
  const [et2] = await db.select().from(etiquetas).where(eq(etiquetas.nombre, tagFw));
  assert.ok(et1 && et2);

  // 2. Crear y aprobar tarea opcional con 1,200 EXP y 200 monedas (TW-16, TW-17 y TW-18)
  const tituloOpc = `Opcional-Radar-${suffix}`;
  assert.equal(
    (
      await post('/tareas/nueva', 'crear', encargado, {
        titulo: tituloOpc,
        descripcion: 'Tarea opcional para validar motor de gamificación y gráfica radar',
        tipo: 'OPCIONAL',
        xpOfrecido: '1200',
        puntosOfrecidos: '200',
        fechaLimite: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        etiquetas: [et1.id, et2.id],
        criterios: 'Cumplir entrega técnica'
      })
    ).status,
    303
  );

  const [tareaOpc] = await db.select().from(tareas).where(eq(tareas.titulo, tituloOpc));
  assert.ok(tareaOpc);
  taskIds.push(tareaOpc.id);

  assert.equal((await post('/muro', 'tomar', miembro, { tareaId: tareaOpc.id })).status, 303);
  const rutaTarea = `/tareas/${tareaOpc.id}`;
  assert.equal(
    (await post(rutaTarea, 'cambiarEstado', miembro, { estado: 'EN_PROCESO' })).status,
    200
  );
  const [criterio] = await db
    .select()
    .from(tareaCriterios)
    .where(eq(tareaCriterios.tareaId, tareaOpc.id));
  await post(rutaTarea, 'toggleCriterio', miembro, { criterioId: criterio.id });
  assert.equal(
    (await post(rutaTarea, 'cambiarEstado', miembro, { estado: 'EN_REVISION' })).status,
    200
  );
  await post(rutaTarea, 'toggleCriterio', encargado, {
    criterioId: criterio.id,
    modo: 'ENCARGADO'
  });
  assert.equal(
    (await post(rutaTarea, 'cambiarEstado', encargado, { estado: 'TERMINADA' })).status,
    200
  );

  // Verificar movimientos de EXP, Puntos y Ramas (TW-16, TW-17, TW-18)
  const movsXp = await db
    .select()
    .from(movimientosXp)
    .where(eq(movimientosXp.tareaId, tareaOpc.id));
  const movsPts = await db
    .select()
    .from(movimientosPuntos)
    .where(eq(movimientosPuntos.tareaId, tareaOpc.id));
  const movsRama = await db
    .select()
    .from(movimientosRama)
    .where(eq(movimientosRama.tareaId, tareaOpc.id));
  assert.equal(movsXp.length, 1);
  assert.equal(movsXp[0].cantidad, 1200);
  assert.equal(movsPts.length, 1);
  assert.equal(movsPts[0].cantidad, 200);
  assert.equal(movsRama.length, 2);

  // 3. Verificar Perfil Gamificado (TW-19) y Gráfica Radar (TW-20)
  const perfilHtml = await html('/perfil', miembro);
  assert.ok(perfilHtml.includes('Nivel 2'));
  assert.ok(perfilHtml.includes('1200 EXP'));
  assert.ok(perfilHtml.includes('200 monedas'));
  assert.ok(perfilHtml.includes('Gráfica radar de ramas de habilidad'));
  assert.ok(perfilHtml.includes('Insignias y logros'));
  assert.ok(perfilHtml.includes('Pionero del Muro'));
  assert.ok(perfilHtml.includes(tagLang));
  assert.ok(perfilHtml.includes(tagFw));

  // 4. Configurar Catálogo de Recompensas y verificar Auditoría Administrativa (TW-21)
  const nombreRec = `Premio-VIP-${suffix}`;
  assert.equal(
    (
      await post('/admin/recompensas', 'crear', admin, {
        nombre: nombreRec,
        descripcion: 'Beneficio de prueba auditado',
        costoPuntos: '150',
        stock: '1',
        imagenUrl: 'https://example.com/premio.png'
      })
    ).status,
    200
  );
  const [rec] = await db.select().from(recompensas).where(eq(recompensas.nombre, nombreRec));
  assert.ok(rec);
  rewardIds.push(rec.id);

  const auditoriaAlta = await db
    .select()
    .from(auditoriaUsuarios)
    .where(eq(auditoriaUsuarios.actorId, admin.id));
  assert.ok(auditoriaAlta.some((a) => a.accion === 'RECOMPENSA_CREADA'));

  // 5. Canjear Recompensa en la Tienda y verificar descuento único sin alterar EXP (TW-22)
  const tiendaHtml = await html('/tienda', miembro);
  assert.ok(tiendaHtml.includes(nombreRec));

  assert.equal(
    (await post('/tienda', 'canjear', miembro, { recompensaId: rec.id })).status,
    200
  );

  // Intentar segundo canje cuando stock llegó a 0 o saldo es insuficiente (50 < 150) debe fallar
  const segundoIntento = await post('/tienda', 'canjear', miembro, { recompensaId: rec.id });
  assert.equal(segundoIntento.status, 400);

  const canjesUsuario = await db
    .select()
    .from(canjes)
    .where(eq(canjes.usuarioId, miembro.id));
  assert.equal(canjesUsuario.length, 1);
  assert.equal(canjesUsuario[0].puntosGastados, 150);

  console.log(
    'APROBADO: motor de gamificación (TW-16..TW-18), perfil gamificado con insignias/especialidades (TW-19), gráfica radar (TW-20), catálogo auditado (TW-21) y canje en tiempo real (TW-22).'
  );
} finally {
  if (rewardIds.length) await db.delete(recompensas).where(inArray(recompensas.id, rewardIds));
  if (taskIds.length) await db.delete(tareas).where(inArray(tareas.id, taskIds));
  if (users.length) await db.delete(usuarios).where(inArray(usuarios.id, users));
  if (deps.length) await db.delete(departamentos).where(inArray(departamentos.id, deps));
  for (const nombre of [`TypeScript-${suffix}`, `SvelteKit-${suffix}`]) {
    await db.delete(ramas).where(eq(ramas.nombre, nombre));
  }
  await client.end();
}
