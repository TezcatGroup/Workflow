// Ejecutar únicamente sobre una instancia aislada. Conserva datos para revisión visual.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import sharp from 'sharp';
if (process.env.WORKFLOW_TEST_ONLY !== '1') throw new Error('Requiere WORKFLOW_TEST_ONLY=1');
assert.ok(process.env.DATABASE_URL && process.env.TEST_BASE_URL && process.env.ADMIN_PASSWORD);
const sql = postgres(process.env.DATABASE_URL), base = process.env.TEST_BASE_URL;
const suffix = randomUUID().slice(0,8), password = 'CompletionPrueba123!';
const req = (path, cookie = '', options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { accept: 'text/html', origin: base, cookie, ...options.headers } });
const post = (path, action, cookie, values) => req(`${path}?/${action}`, cookie, { method: 'POST', body: new URLSearchParams(values) });
const status = async (r, n) => assert.equal(r.status, n, (await r.text()).slice(0,300));
async function login(email, pwd = password) { const r = await req('/login', '', { method:'POST', body:new URLSearchParams({email,password:pwd}) }); assert.equal(r.status,303); return r.headers.get('set-cookie').split(';')[0]; }
const results = [];
async function test(name, fn) { await fn(); results.push(name); console.log('PASS',name); }
try {
  const admin = await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
  const [a,b] = await sql`insert into departamentos (nombre) values (${`A ${suffix}`}), (${`B ${suffix}`}) returning id`;
  const users = {};
  for (const [key,rol,dep] of [['manager','ENCARGADO',a.id],['member','MIEMBRO',a.id],['other','ENCARGADO',b.id]]) {
    const email = `${key}-${suffix}@completion.local`;
    await status(await post('/admin/usuarios','crear',admin,{nombre:`QA ${key} ${suffix}`,email,password,rol,departamentoId:dep}),200);
    users[key] = { ...(await sql`select id from usuarios where email=${email}`)[0],email,cookie:await login(email) };
  }
  let proyectoId;
  await test('Proyectos: alta, edición, archivo y aislamiento por rol/departamento',async()=>{
    await status(await req('/proyectos'),303);
    await status(await req('/proyectos',users.member.cookie),403);
    await status(await post('/proyectos','crear',users.member.cookie,{nombre:'No',departamentoId:a.id}),403);
    await status(await post('/proyectos','crear',users.manager.cookie,{nombre:`Proyecto ${suffix}`,descripcion:'Inicial',departamentoId:a.id}),200);
    proyectoId = (await sql`select id from proyectos where nombre=${`Proyecto ${suffix}`}`)[0].id;
    const values={id:proyectoId,nombre:`Editado ${suffix}`,descripcion:'Detalle',departamentoId:a.id,activo:'false'};
    await status(await post('/proyectos','actualizar',users.other.cookie,values),404);
    await status(await post('/proyectos','actualizar',users.manager.cookie,values),200);
    assert.equal((await sql`select activo from proyectos where id=${proyectoId}`)[0].activo,false);
    assert.ok(!(await (await req('/tareas/nueva',users.manager.cookie)).text()).includes(`Editado ${suffix}`));
    await status(await post('/proyectos','actualizar',admin,{...values,activo:'true'}),200);
    assert.ok((await (await req('/tareas/nueva',users.manager.cookie)).text()).includes(`Editado ${suffix}`));
    await status(await post('/proyectos','actualizar',admin,{...values,departamentoId:b.id}),400);
  });
  let taskId;
  await test('Tareas: edición autorizada, validaciones, historial y conflicto de versión',async()=>{
    const r = await post('/tareas/nueva','crear',users.manager.cookie,{titulo:`Tarea ${suffix}`,responsableId:users.member.id,fechaLimite:new Date(Date.now()+864000000).toISOString(),proyectoId,criterios:'Entregar documentación'});
    assert.equal(r.status,303); taskId=r.headers.get('location').split('/').at(-1);
    const [t] = await sql`select * from tareas where id=${taskId}`;
    const values={titulo:'Título corregido',descripcion:'Descripción corregida',prioridad:'ALTA',fechaLimite:t.fecha_limite.toISOString(),version:t.actualizado_en.toISOString(),motivo:'Corrección de alcance'};
    await status(await post(`/tareas/${taskId}`,'editar',users.member.cookie,values),403);
    await status(await post(`/tareas/${taskId}`,'editar',admin,values),403);
    await status(await post(`/tareas/${taskId}`,'editar',users.other.cookie,values),403);
    await status(await post(`/tareas/${taskId}`,'editar',users.manager.cookie,{...values,titulo:''}),400);
    await status(await post(`/tareas/${taskId}`,'editar',users.manager.cookie,{...values,fechaLimite:'2000-01-01'}),400);
    await status(await post(`/tareas/${taskId}`,'editar',users.manager.cookie,values),200);
    await status(await post(`/tareas/${taskId}`,'editar',users.manager.cookie,values),409);
    const [evento]=await sql`select detalle from tarea_eventos where tarea_id=${taskId} and tipo='TAREA_EDITADA'`;
    assert.equal(evento.detalle.antes.titulo,`Tarea ${suffix}`); assert.equal(evento.detalle.despues.titulo,values.titulo);
    for (const estado of ['EN_REVISION','TERMINADA']) { await sql`update tareas set estado=${estado} where id=${taskId}`; await status(await post(`/tareas/${taskId}`,'editar',users.manager.cookie,values),400); }
    await sql`update tareas set estado='ASIGNADA' where id=${taskId}`;
  });
  await test('Niveles coherentes en dashboard y perfil',async()=>{
    await sql`insert into movimientos_xp (usuario_id,cantidad,motivo) values (${users.member.id},1000,'Prueba de nivel')`;
    for (const path of ['/perfil','/dashboard']) {
      const html=await (await req(path,users.member.cookie)).text();
      assert.ok(path === '/perfil' ? /nivel:2|Nivel\s*(?:<!--[^]*?-->)?\s*2/i.test(html) : html.includes('nivelSiguiente:3'), 'Nivel incorrecto en ' + path);
    }
  });
  await test('Auditoría: más de 100 eventos, búsqueda global, fechas y paginación',async()=>{
    await sql`insert into auditoria_usuarios (actor_id,accion,detalle,creada_en) select ${users.manager.id},${'PAGINA_' + suffix},jsonb_build_object('nombre','Historico ' || n), '2020-01-01'::timestamptz + n * interval '1 hour' from generate_series(1,105) n`;
    const html=await (await req(`/admin/auditoria?accion=PAGINA_${suffix}&pagina=5`,admin)).text();
    assert.ok(html.includes('Historico 1')); assert.ok(html.includes('105 resultados'));
    const filtered=await (await req('/admin/auditoria?q=Historico%201&desde=2020-01-01&hasta=2020-01-01',admin)).text(); assert.ok(filtered.includes('Historico 1'));
    await status(await req('/admin/auditoria?desde=2020-02-31',admin),400);
    await status(await req('/admin/auditoria?desde=2021-01-01&hasta=2020-01-01',admin),400);
    await status(await req('/admin/auditoria?pagina=NaN',admin),200);
  });
  await test('Fotos del equipo: foto real y rechazo de cuentas ajenas',async()=>{
    const png=await sharp({create:{width:32,height:32,channels:3,background:'#32baca'}}).png().toBuffer();
    const f=new FormData();f.append('foto',new Blob([png]),'foto.png');
    await status(await req('/perfil?/guardarFoto',users.member.cookie,{method:'POST',body:f}),200);
    await status(await req(`/equipo/${users.member.id}/foto`,users.manager.cookie),200);
    await status(await req(`/equipo/${users.member.id}/foto`,users.other.cookie),404);
    await status(await req(`/equipo/${users.member.id}/foto`,users.member.cookie),403);
    assert.ok((await (await req('/equipo',users.manager.cookie)).text()).includes(`/equipo/${users.member.id}/foto`));
  });
  await test('Restablecimiento: permisos, confirmación, contraseña anterior revocada y sesiones cerradas',async()=>{
    const nueva='RecuperadaPrueba456!';
    const values={id:users.member.id,nueva,confirmacion:nueva,passwordAdmin:process.env.ADMIN_PASSWORD};
    await status(await post('/admin/usuarios','restablecerPassword',users.manager.cookie,values),303);
    await status(await post('/admin/usuarios','restablecerPassword',admin,{...values,passwordAdmin:'Incorrecta'}),403);
    await status(await post('/admin/usuarios','restablecerPassword',admin,{...values,confirmacion:'diferente'}),400);
    const [adminUser]=await sql`select id from usuarios where email=${process.env.ADMIN_EMAIL}`;
    await status(await post('/admin/usuarios','restablecerPassword',admin,{...values,id:adminUser.id}),400);
    await status(await post('/admin/usuarios','restablecerPassword',admin,values),200);
    await status(await req('/perfil',users.member.cookie),303);
    await status(await req('/login','',{method:'POST',body:new URLSearchParams({email:users.member.email,password})}),400);
    users.member.cookie=await login(users.member.email,nueva); users.member.password=nueva;
    const [audit]=await sql`select detalle from auditoria_usuarios where usuario_objetivo_id=${users.member.id} and accion='PASSWORD_RESTABLECIDA'`;
    assert.deepEqual(audit.detalle,{sesionesRevocadas:true});
  });
  await writeFile('/tmp/completion-fixtures.json',JSON.stringify({users,password,taskId,proyectoId}));
  console.log(JSON.stringify({passed:results.length,results},null,2));
} finally { await sql.end(); }
