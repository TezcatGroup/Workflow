// Pruebas de invariantes monetarias. Solo base desechable; conserva evidencias.
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { readFile, writeFile } from 'node:fs/promises';
if(process.env.WORKFLOW_TEST_ONLY!=='1') throw new Error('Requiere WORKFLOW_TEST_ONLY=1');
const sql=postgres(process.env.DATABASE_URL), base=process.env.TEST_BASE_URL;
assert.ok(process.env.DATABASE_URL && base && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD,'Faltan variables de prueba');
const f=JSON.parse(await readFile(process.env.TEST_FIXTURES||'/tmp/functional-fixtures.json','utf8'));
const results=[];
async function login(email,password){const r=await fetch(base+'/login',{method:'POST',redirect:'manual',headers:{origin:base,accept:"text/html"},body:new URLSearchParams({email,password})});assert.equal(r.status,303);return r.headers.get('set-cookie').split(';')[0];}
async function action(path,name,cookie,fields){return fetch(`${base}${path}?/${name}`,{method:'POST',redirect:'manual',headers:{origin:base,cookie,accept:"text/html"},body:new URLSearchParams(fields)});}
async function test(name,fn){try{const details=await fn();results.push({name,status:'PASS',details});}catch(e){results.push({name,status:'FAIL',error:e.message});}console.log(JSON.stringify(results.at(-1)));}
try{
 const member=await login(f.actors.peer.email,f.password),admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
 const uid=f.actors.peer.id;
 await test('Canjes simultáneos de artículos distintos no gastan más que el saldo',async()=>{
  await sql`insert into movimientos_puntos(usuario_id,cantidad,motivo) values(${uid},40,'QA concurrencia')`;
  const rs=[];
  for(let i=0;i<8;i++)rs.push((await sql`insert into recompensas(nombre,costo_puntos,stock) values(${`QA concurrencia ${uid} ${i}`},40,1) returning id`)[0]);
  const responses=await Promise.all(rs.map(r=>action('/tienda','canjear',member,{recompensaId:r.id})));
  const balance=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  const statuses=responses.map(r=>r.status);assert.ok(balance>=0,JSON.stringify({balance,statuses}));
  assert.equal(statuses.filter(s=>s===200).length,1);return {balance,statuses};
 });
 await test('Cancelar simultáneamente el mismo canje reembolsa una sola vez',async()=>{
  const [c]=await sql`select * from canjes where usuario_id=${uid} and estado='PENDIENTE' limit 1`;assert.ok(c);
  const before=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  const responses=await Promise.all(Array.from({length:8},()=>action('/admin/recompensas','resolverCanje',admin,{canjeId:c.id,accion:'CANCELAR'})));
  const after=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  assert.equal(after-before,c.puntos_gastados,JSON.stringify({before,after,cost:c.puntos_gastados,statuses:responses.map(r=>r.status)}));
  return {before,after};
 });
 await test('Tienda y perfil comparten el bloqueo de saldo',async()=>{
  const rs=[];
  for(let i=0;i<8;i++)rs.push((await sql`insert into recompensas(nombre,costo_puntos,stock) values(${`QA mixto ${uid} ${i}`},40,1) returning id`)[0]);
  const responses=await Promise.all(rs.map((r,i)=>action(i%2?'/perfil':'/tienda','canjear',member,{recompensaId:r.id})));
  const balance=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  assert.equal(balance,0);assert.equal(responses.filter(r=>r.status===200).length,1);return {balance};
 });
 await test('Entregar y cancelar simultáneamente solo resuelven una vez',async()=>{
  const [c]=await sql`select * from canjes where usuario_id=${uid} and estado='PENDIENTE' limit 1`;assert.ok(c);
  const before=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  const responses=await Promise.all(Array.from({length:8},(_,i)=>action('/admin/recompensas','resolverCanje',admin,{canjeId:c.id,accion:i%2?'CANCELAR':'ENTREGAR'})));
  assert.equal(responses.filter(r=>r.status===200).length,1);
  const [after]=await sql`select estado from canjes where id=${c.id}`;
  const balance=Number((await sql`select sum(cantidad) n from movimientos_puntos where usuario_id=${uid}`)[0].n);
  assert.equal(balance-before,after.estado==='CANCELADO'?c.puntos_gastados:0);
  assert.equal((await sql`select * from auditoria_usuarios where detalle->>'canjeId'=${c.id} and accion in ('CANJE_ENTREGADO','CANJE_CANCELADO')`).length,1);
  return {estado:after.estado,balance};
 });
 await test('Cancelar canjes distintos del mismo artículo recupera todo el stock',async()=>{
  await sql`insert into movimientos_puntos(usuario_id,cantidad,motivo) values(${uid},200,'QA stock concurrente')`;
  const [r]=await sql`insert into recompensas(nombre,costo_puntos,stock) values('QA stock compartido',40,10) returning id`;
  for(let i=0;i<3;i++)assert.equal((await action('/tienda','canjear',member,{recompensaId:r.id})).status,200);
  const cs=await sql`select id from canjes where recompensa_id=${r.id}`;
  const responses=await Promise.all(cs.map(c=>action('/admin/recompensas','resolverCanje',admin,{canjeId:c.id,accion:'CANCELAR'})));
  assert.ok(responses.every(r=>r.status===200));assert.equal((await sql`select stock from recompensas where id=${r.id}`)[0].stock,10);
  return {stock:10};
 });
 await writeFile(process.env.TEST_CONCURRENCY_REPORT||'/tmp/concurrency-report.json',JSON.stringify(results,null,2));
 if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}finally{await sql.end();}
