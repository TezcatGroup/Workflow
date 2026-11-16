// Solo datos sintéticos, después de verify-functional.mjs en una instancia aislada.
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
if(process.env.WORKFLOW_TEST_ONLY!=='1')throw new Error('Requiere WORKFLOW_TEST_ONLY=1');
assert.ok(process.env.DATABASE_URL&&process.env.TEST_BASE_URL&&process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD);
const sql=postgres(process.env.DATABASE_URL),base=process.env.TEST_BASE_URL;
const fixtures=JSON.parse(await readFile(process.env.TEST_FIXTURES||'/tmp/functional-fixtures.json','utf8'));
const results=[];
async function request(path,cookie='',options={}){return fetch(base+path,{redirect:'manual',...options,headers:{origin:base,accept:'text/html',cookie,...options.headers}});}
async function login(email,password){const r=await request('/login','',{method:'POST',body:new URLSearchParams({email,password})});assert.equal(r.status,303);return r.headers.get('set-cookie').split(';')[0];}
const post=(path,action,cookie,fields={})=>request(`${path}?/${action}`,cookie,{method:'POST',body:new URLSearchParams(fields)});
async function expect(r,status){assert.equal(r.status,status,(await r.text()).slice(0,300));}
try{
 const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
 const manager=await login(fixtures.actors.manager.email,fixtures.password);
 const [boss]=await sql`select departamento_id from usuarios where id=${fixtures.actors.manager.id}`;
 const email=`delete-${randomUUID()}@functional.local`;
 await expect(await post('/admin/usuarios','crear',admin,{nombre:'Cuenta de prueba de eliminación',email,password:fixtures.password,rol:'MIEMBRO',departamentoId:boss.departamento_id}),200);
 const [user]=await sql`select id from usuarios where email=${email}`;
 const member=await login(email,fixtures.password);
 const del=(cookie=admin,fields={id:user.id,confirmacionEmail:email})=>post('/admin/usuarios','eliminar',cookie,fields);
 await expect(await del(member),303);await expect(await del(admin,{id:'invalido',confirmacionEmail:email}),400);
 await expect(await del(admin,{id:user.id,confirmacionEmail:'incorrecto@example.com'}),400);
 const [adminUser]=await sql`select id from usuarios where email=${process.env.ADMIN_EMAIL}`;
 await expect(await del(admin,{id:adminUser.id,confirmacionEmail:process.env.ADMIN_EMAIL}),400);
 results.push('Permisos, UUID, confirmación de correo y prohibición de eliminarse a sí mismo');
 const created=await post('/tareas/nueva','crear',manager,{titulo:'Tarea que conserva historial al borrar cuenta',responsableId:user.id,fechaLimite:new Date(Date.now()+3*86400000).toISOString().slice(0,10)});
 assert.equal(created.status,303);const path=created.headers.get('location'),id=path.split('/').at(-1);
 await expect(await del(),400);
 await expect(await post(path,'comentar',member,{contenido:'Este historial debe conservarse'}),200);
 const form=new FormData();form.append('archivos',new Blob(['Archivo conservado'],{type:'text/plain'}),'conservado.txt');
 await expect(await request(`${path}?/subirArchivo`,member,{method:'POST',body:form}),200);
 const [file]=await sql`select * from tarea_archivos where tarea_id=${id}`;
 for(const estado of ['EN_PROCESO','EN_REVISION'])await expect(await post(path,'cambiarEstado',member,{estado}),200);
 await expect(await post(path,'cambiarEstado',manager,{estado:'TERMINADA'}),200);
 results.push('Rechazo con tarea pendiente y finalización normal antes de eliminar');
 const [reward]=await sql`insert into recompensas(nombre,costo_puntos,stock) values('QA borrado de cuenta',10,1) returning id`;
 await sql`insert into movimientos_puntos(usuario_id,cantidad,motivo) values(${user.id},20,'QA eliminación')`;
 await expect(await post('/tienda','canjear',member,{recompensaId:reward.id}),200);
 await expect(await del(),400);
 const [redeem]=await sql`select id from canjes where usuario_id=${user.id}`;
 await expect(await post('/admin/recompensas','resolverCanje',admin,{canjeId:redeem.id,accion:'CANCELAR'}),200);
 results.push('Rechazo con canje pendiente y resolución previa');
 await expect(await del(),200);await expect(await del(),404);
 assert.equal((await sql`select id from usuarios where id=${user.id}`).length,0);
 assert.equal((await sql`select id from sesiones where usuario_id=${user.id}`).length,0);
 assert.equal((await request('/dashboard',member)).headers.get('location'),'/login');
 const [task]=await sql`select * from tareas where id=${id}`;assert.equal(task.estado,'TERMINADA');assert.equal(task.responsable_id,null);
 const [message]=await sql`select * from tarea_mensajes where tarea_id=${id}`;assert.equal(message.autor_id,null);assert.equal(message.contenido,'Este historial debe conservarse');
 assert.equal(await (await request(file.ruta,admin)).text(),'Archivo conservado');
 const audit=await sql`select * from auditoria_usuarios where accion='USUARIO_ELIMINADO' and detalle->'usuarioEliminado'->>'id'=${user.id}`;
 assert.equal(audit.length,1);assert.equal(audit[0].detalle.usuarioEliminado.email,email);assert.ok(!JSON.stringify(audit).includes('password'));
 assert.equal((await sql`select * from auditoria_usuarios where accion='USUARIO_CREADO' and detalle->'usuarioEliminado'->>'id'=${user.id}`).length,1);
 results.push('Borrado permanente, sesiones revocadas, repetición rechazada, auditoría única, tareas/mensajes/adjuntos conservados');
 const admins=[];
 for(const label of ['a','b']){
   const email=`admin-delete-${label}-${randomUUID()}@functional.local`;
   await expect(await post('/admin/usuarios','crear',admin,{nombre:`QA administrador ${label}`,email,password:fixtures.password,rol:'ADMIN'}),200);
   admins.push({email,cookie:await login(email,fixtures.password),...(await sql`select id from usuarios where email=${email}`)[0]});
 }
 const race=await Promise.all(admins.map((a,i)=>del(a.cookie,{id:admins[1-i].id,confirmacionEmail:admins[1-i].email})));
 assert.equal(race.filter(r=>r.status===200).length,1);
 assert.equal((await sql`select id from usuarios where id in ${sql(admins.map(a=>a.id))}`).length,1);
 results.push('Dos administradores intentan eliminarse simultáneamente: solo una eliminación, sin interbloqueo');
 await writeFile(process.env.TEST_DELETE_REPORT||'/tmp/user-deletion-report.json',JSON.stringify({status:'PASS',results},null,2));
 console.log('PASS',results);
}finally{await sql.end();}
