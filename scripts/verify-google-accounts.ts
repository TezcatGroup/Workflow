import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import type { Cookies } from '@sveltejs/kit';
import { accederConGoogle } from '../src/lib/server/google-login';
import { autenticar, hashPassword } from '../src/lib/server/auth';
if(process.env.WORKFLOW_TEST_ONLY!=='1')throw new Error('Requiere una base aislada y WORKFLOW_TEST_ONLY=1');
const sql=postgres(process.env.DATABASE_URL!),password='GooglePrueba123!',results:string[]=[];
const cookies=()=>{const values=new Map<string,string>();return {values,api:{set(name:string,value:string){values.set(name,value)}} as unknown as Cookies}};
try{
 const before=Number((await sql`select count(*) n from usuarios`)[0].n),beforeSessions=Number((await sql`select count(*) n from sesiones`)[0].n);
 await assert.rejects(accederConGoogle({email:'unknown@gmail.com',sub:randomUUID()},cookies().api,false));
 assert.equal(Number((await sql`select count(*) n from usuarios`)[0].n),before);
 assert.equal(Number((await sql`select count(*) n from sesiones`)[0].n),beforeSessions);
 results.push('Correo desconocido rechazado sin crear usuario ni sesión');
 for(const rol of ['ADMIN','ENCARGADO','MIEMBRO']){
  const email=`google-${randomUUID()}@gmail.com`,sub=randomUUID(),hash=await hashPassword(password);
  const [user]=await sql`insert into usuarios(nombre,email,password_hash,rol) values('Google QA',${email},${hash},${rol}) returning id`;
  const jar=cookies();assert.equal(await accederConGoogle({email,sub},jar.api,false),rol==='ADMIN'?'/admin':'/dashboard');
  assert.ok(jar.values.has('tezcat_session'));
  const [after]=await sql`select nombre,rol,password_hash,google_sub from usuarios where id=${user.id}`;
  assert.equal(after.nombre,'Google QA');assert.equal(after.rol,rol);assert.equal(after.password_hash,hash);assert.equal(after.google_sub,sub);
  assert.ok(await autenticar(email,password));
  await accederConGoogle({email,sub},cookies().api,false);
  await assert.rejects(accederConGoogle({email,sub:randomUUID()},cookies().api,false));
  await sql`update usuarios set activo=false where id=${user.id}`;await assert.rejects(accederConGoogle({email,sub},cookies().api,false));
  await sql`update usuarios set activo=true,bloqueado_hasta=now()+interval '15 minutes' where id=${user.id}`;await assert.rejects(accederConGoogle({email,sub},cookies().api,false));
  await sql`update usuarios set bloqueado_hasta=null where id=${user.id}`;
  const otherEmail=`other-${randomUUID()}@gmail.com`;
  await sql`insert into usuarios(nombre,email,password_hash,rol) values('Otro QA',${otherEmail},${hash},'MIEMBRO')`;
  await assert.rejects(accederConGoogle({email:otherEmail,sub},cookies().api,false));
  await sql`delete from usuarios where id=${user.id}`;await assert.rejects(accederConGoogle({email,sub},cookies().api,false));
  assert.equal((await sql`select id from sesiones where usuario_id=${user.id}`).length,0);
  results.push(`${rol}: Google y contraseña, vinculación sub, datos intactos; bloqueo/inactivación/eliminación y otra identidad rechazados`);
 }
 const email=`race-${randomUUID()}@gmail.com`,hash=await hashPassword(password);
 await sql`insert into usuarios(nombre,email,password_hash) values('Race QA',${email},${hash})`;
 const race=await Promise.allSettled([randomUUID(),randomUUID()].map(sub=>accederConGoogle({email,sub},cookies().api,false)));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 results.push('Dos identidades concurrentes para un correo: solo una consigue vincularse');
 console.log(JSON.stringify({passed:results.length,results},null,2));
 await sql.end();process.exit(0);
}catch(e){console.error(e);await sql.end();process.exit(1)}
