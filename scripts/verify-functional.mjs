// Solo para una instancia aislada: crea datos sintéticos y los conserva para inspección.
// WORKFLOW_TEST_ONLY=1 DATABASE_URL=... TEST_BASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=...
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
if (process.env.WORKFLOW_TEST_ONLY !== '1') throw new Error('Requiere WORKFLOW_TEST_ONLY=1 y una base exclusiva de pruebas');
const sql = postgres(process.env.DATABASE_URL, { max: 8 });
const base = process.env.TEST_BASE_URL;
assert.ok(base && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.DATABASE_URL);
const suffix = randomUUID().slice(0, 8), password = 'PruebaFuncional123!';
const results = [], actors = {};
async function req(path, actor, options = {}) {
  return fetch(base + path, { redirect: 'manual', ...options,
    headers: { origin: base, accept: 'text/html', cookie: actor?.cookie ?? '', ...options.headers } });
}
const post = (path, name, actor, fields = {}) => req(`${path}?/${name}`, actor,
  { method: 'POST', body: new URLSearchParams(fields) });
async function expect(response, status) { assert.equal(response.status, status, `${response.url}: ${await response.text()}`); }
async function test(name, fn) {
  try { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS', name); }
  catch (e) { results.push({ name, status: 'FAIL', error: e.message }); console.error('FAIL', name, e.message.slice(0, 500)); }
}
async function login(email, pass) {
  const r = await req('/login', null, { method: 'POST', body: new URLSearchParams({ email, password: pass }) });
  assert.equal(r.status, 303, `login ${email}`);
  return { email, cookie: r.headers.get('set-cookie').split(';')[0] };
}
async function task(label, member = actors.member) {
  const r = await post('/tareas/nueva', 'crear', actors.manager, { titulo: `${label} ${suffix}`, responsableId: member.id,
    fechaLimite: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), criterios: 'Entregar resultado' });
  assert.equal(r.status, 303);
  return r.headers.get('location');
}
try {
  actors.admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const deps = [];
  for (const n of ['A', 'B']) {
    const nombre = `Funcional ${n} ${suffix}`;
    await expect(await post('/admin/departamentos', 'crear', actors.admin, { nombre }), 200);
    deps.push((await sql`select id from departamentos where nombre=${nombre}`)[0].id);
  }
  for (const [key, rol, dep] of [['manager','ENCARGADO',0],['member','MIEMBRO',0],['peer','MIEMBRO',0],['outsider','MIEMBRO',1]]) {
    const email = `${key}-${suffix}@functional.local`;
    await expect(await post('/admin/usuarios', 'crear', actors.admin, { nombre: `QA ${key} ${suffix}`, email, password, rol, departamentoId: deps[dep] }), 200);
    actors[key] = { ...await login(email, password), ...(await sql`select id from usuarios where email=${email}`)[0] };
  }
  const routeMatrix = [];
  await test('Rutas de administración y permisos de los tres roles', async () => {
    for (const path of ['/admin','/admin/usuarios','/admin/departamentos','/admin/etiquetas','/admin/recompensas','/admin/auditoria']) {
      for (const key of ['admin','manager','member']) {
        const r = await req(path, actors[key]); routeMatrix.push({ path, role:key, status:r.status });
        await expect(r, key === 'admin' ? 200 : 303);
      }
    }
  });
  await test('Dashboard, tareas, muro, perfil, equipo, tienda y notificaciones por rol', async () => {
    for (const path of ['/dashboard','/tareas','/muro','/perfil','/equipo','/tienda','/notificaciones','/tareas/nueva']) {
      for (const key of ['admin','manager','member']) {
        let status = 200;
        if (path === '/equipo' && key === 'admin') status = 403;
        if (path === '/tareas/nueva' && key !== 'manager') status = 403;
        if (['/tienda','/notificaciones','/dashboard'].includes(path) && key === 'admin') status = 303;
        const r = await req(path, actors[key]); routeMatrix.push({ path, role:key, status:r.status }); await expect(r, status);
      }
      assert.equal((await req(path)).status,303, `anónimo ${path}`);
    }
    const team = await (await req('/equipo',actors.manager)).text();
    assert.ok(team.includes(`QA member ${suffix}`)); assert.ok(!team.includes(`QA outsider ${suffix}`));
  });
  const t = await task('Conversacion'), id = t.split('/').at(-1);
  await test('Comentarios y mensaje rápido: persistencia, validación y aislamiento', async () => {
    await expect(await post(t,'comentar',actors.member,{contenido:'Mensaje de miembro'}),200);
    await expect(await post('/tareas','enviarMensajeRapido',actors.manager,{tareaId:id,contenido:'Respuesta rápida'}),200);
    await expect(await post(t,'comentar',actors.member,{contenido:''}),400);
    await expect(await post(t,'comentar',actors.member,{contenido:'x'.repeat(6000)}),400);
    for (const key of ['admin','peer','outsider']) await expect(await post(t,'comentar',actors[key],{contenido:'No autorizado'}),403);
    assert.equal((await sql`select * from tarea_mensajes where tarea_id=${id}`).length,2);
  });
  await test('Adjuntos: subir, descargar, permisos, enlaces y eliminar', async () => {
    const form = new FormData(); form.append('archivos',new Blob(['contenido QA'],{type:'text/plain'}),'prueba.txt');
    await expect(await req(`${t}?/subirArchivo`,actors.member,{method:'POST',body:form}),200);
    const [f] = await sql`select * from tarea_archivos where tarea_id=${id}`;
    assert.equal(await (await req(f.ruta,actors.member)).text(),'contenido QA');
    assert.equal((await req(f.ruta)).status,401);
    await expect(await req(f.ruta,actors.outsider),403);
    await expect(await post(t,'eliminarArchivo',actors.admin,{archivoId:f.id}),403);
    await expect(await post(t,'subirArchivo',actors.member,{enlaceUrl:'javascript:alert(1)'}),400);
    await expect(await post(t,'subirArchivo',actors.member,{enlaceUrl:'https://example.com/',enlaceTitulo:'Referencia QA'}),200);
    await expect(await post(t,'eliminarArchivo',actors.member,{archivoId:f.id}),200);
    assert.equal((await req(f.ruta,actors.member)).status,404);
    const [link] = await sql`select * from tarea_archivos where tarea_id=${id}`;
    await expect(await post(t,'eliminarArchivo',actors.manager,{archivoId:link.id}),200);
    assert.equal((await sql`select * from tarea_archivos where tarea_id=${id}`).length,0);
  });
  await test('Reasignación: rechazar, aprobar, duplicados y antiguo responsable', async () => {
    await expect(await post(t,'solicitarReasignacion',actors.peer,{motivo:'Cambio'}),403);
    await expect(await post(t,'solicitarReasignacion',actors.member,{motivo:''}),400);
    await expect(await post(t,'solicitarReasignacion',actors.member,{motivo:'Carga de trabajo'}),200);
    await expect(await post(t,'solicitarReasignacion',actors.member,{motivo:'Duplicada'}),400);
    await expect(await post(t,'resolverReasignacion',actors.member,{decision:'DECLINAR',motivoRechazo:'No'}),403);
    await expect(await post(t,'resolverReasignacion',actors.manager,{decision:'DECLINAR'}),400);
    await expect(await post(t,'resolverReasignacion',actors.manager,{decision:'DECLINAR',motivoRechazo:'Prioridad del equipo'}),200);
    assert.ok((await sql`select * from tarea_mensajes where tarea_id=${id} and contenido like '%Prioridad del equipo%'`).length);
    await expect(await post(t,'solicitarReasignacion',actors.member,{motivo:'Nuevo motivo'}),200);
    await expect(await post(t,'resolverReasignacion',actors.manager,{decision:'APROBAR',nuevoResponsableId:actors.outsider.id}),400);
    await expect(await post(t,'resolverReasignacion',actors.manager,{decision:'APROBAR',nuevoResponsableId:actors.peer.id}),200);
    assert.equal((await sql`select responsable_id from tareas where id=${id}`)[0].responsable_id,actors.peer.id);
    await expect(await req(t,actors.member),200);
    await expect(await post(t,'comentar',actors.member,{contenido:'Ya no puedo escribir'}),403);
    await expect(await post(t,'cambiarEstado',actors.peer,{estado:'EN_PROCESO'}),200);
    const old = await task('Plazo vencido');
    await sql`update tareas set creado_en=now()-interval '30 days', fecha_limite=now()+interval '1 day' where id=${old.split('/').at(-1)}`;
    await expect(await post(old,'solicitarReasignacion',actors.member,{motivo:'Fuera de plazo'}),400);
  });
  await test('Notificaciones: eventos, lectura individual/total y aislamiento',async()=>{
    const api = await (await req('/api/notificaciones',actors.member)).json();
    assert.ok(api.noLeidas>0); const n=api.notificaciones[0];
    await expect(await post('/notificaciones','marcarLeida',actors.outsider,{notificacionId:n.id}),200);
    assert.equal((await sql`select leida from notificaciones where id=${n.id}`)[0].leida,false);
    await expect(await post('/notificaciones','marcarLeida',actors.member,{notificacionId:n.id}),200);
    assert.equal((await sql`select leida from notificaciones where id=${n.id}`)[0].leida,true);
    const r=await req('/api/notificaciones',actors.member,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({todas:true})});
    assert.equal((await r.json()).noLeidas,0);
    await expect(await post('/notificaciones','marcarTodasLeidas',actors.manager),200);
    assert.equal((await sql`select count(*)::int n from notificaciones where usuario_id=${actors.manager.id} and leida=false`)[0].n,0);
  });
  await test('Vencimientos: alerta próxima/vencida y deduplicación',async()=>{
    const near=await task('Vence pronto'), overdue=await task('Vencida');
    const ids=[near.split('/').at(-1),overdue.split('/').at(-1)];
    await sql`update tareas set fecha_limite=now()+interval '5 hours' where id=${ids[0]}`;
    await sql`update tareas set fecha_limite=now()-interval '1 hour' where id=${ids[1]}`;
    await expect(await post('/notificaciones','ejecutarScheduler',actors.member),200);
    const count=async()=>Number((await sql`select count(*)::int n from notificaciones where tarea_id in ${sql(ids)} and (titulo like '%vencer%' or titulo like '%vencida%' or titulo like '%Vencimiento%')`)[0].n);
    assert.equal(await count(),3);
    await expect(await post('/notificaciones','ejecutarScheduler',actors.manager),200); assert.equal(await count(),3);
  });
  let reward;
  await test('Catálogo: crear, editar, desactivar y permisos',async()=>{
    const fields={nombre:`Premio ${suffix}`,costoPuntos:'40',stock:'5'};
    await expect(await post('/admin/recompensas','crear',actors.member,fields),303);
    await expect(await post('/admin/recompensas','crear',actors.admin,{...fields,costoPuntos:'-1'}),400);
    await expect(await post('/admin/recompensas','crear',actors.admin,fields),200);
    reward=(await sql`select * from recompensas where nombre=${fields.nombre}`)[0];
    await expect(await post('/admin/recompensas','actualizar',actors.admin,{...fields,id:reward.id,activo:'false'}),200);
    await expect(await post('/tienda','canjear',actors.member,{recompensaId:reward.id}),400);
    await expect(await post('/admin/recompensas','actualizar',actors.admin,{...fields,id:reward.id,activo:'true'}),200);
  });
  await test('Canjes: tienda/perfil, entrega, cancelación, reembolso y stock',async()=>{
    await expect(await post('/tienda','canjear',actors.member,{recompensaId:reward.id}),400);
    await sql`insert into movimientos_puntos (usuario_id,cantidad,motivo) values (${actors.member.id},200,'Saldo sintético QA')`;
    await expect(await post('/tienda','canjear',actors.admin,{recompensaId:reward.id}),303);
    for (const path of ['/tienda','/perfil']) await expect(await post(path,'canjear',actors.member,{recompensaId:reward.id}),200);
    const cs=await sql`select * from canjes where usuario_id=${actors.member.id} order by creado_en`;
    assert.equal(cs.length,2);
    await expect(await post('/admin/recompensas','resolverCanje',actors.member,{canjeId:cs[0].id,accion:'ENTREGAR'}),303);
    await expect(await post('/admin/recompensas','resolverCanje',actors.admin,{canjeId:cs[0].id,accion:'ENTREGAR'}),200);
    await expect(await post('/admin/recompensas','resolverCanje',actors.admin,{canjeId:cs[1].id,accion:'CANCELAR'}),200);
    await expect(await post('/admin/recompensas','resolverCanje',actors.admin,{canjeId:cs[1].id,accion:'CANCELAR'}),400);
    assert.equal(Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${actors.member.id}`)[0].n),160);
    assert.equal((await sql`select stock from recompensas where id=${reward.id}`)[0].stock,4);
  });
  await test('Eliminar tarea: permisos, cascada y detalle inexistente',async()=>{
    const del=await task('Eliminar'); const tid=del.split('/').at(-1);
    await expect(await post(del,'comentar',actors.member,{contenido:'Se elimina con tarea'}),200);
    await expect(await post(del,'eliminarTarea',actors.member),403);
    await expect(await post(del,'eliminarTarea',actors.manager),303);
    await expect(await req(del,actors.manager),404);
    assert.equal((await sql`select * from tarea_mensajes where tarea_id=${tid}`).length,0);
  });
  await writeFile(process.env.TEST_REPORT || '/tmp/functional-report.json',JSON.stringify({suffix,results,routeMatrix},null,2));
  await writeFile(process.env.TEST_FIXTURES || '/tmp/functional-fixtures.json',JSON.stringify({password,actors:Object.fromEntries(Object.entries(actors).map(([k,v])=>[k,{email:v.email,id:v.id}])),task:t},null,2));
  if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
} finally { await sql.end(); }
