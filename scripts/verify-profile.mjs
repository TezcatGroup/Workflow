// Solo instancia aislada: crea cuentas sintéticas y cambia sus contraseñas.
import assert from 'node:assert/strict';
import postgres from 'postgres';
import sharp from 'sharp';
import { access, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
if (process.env.WORKFLOW_TEST_ONLY !== '1') throw new Error('Requiere WORKFLOW_TEST_ONLY=1');
assert.ok(process.env.DATABASE_URL && process.env.TEST_BASE_URL && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
const sql = postgres(process.env.DATABASE_URL), base = process.env.TEST_BASE_URL;
const results = [], actors = [], password = 'PerfilPrueba123!', nueva = 'PerfilNueva456!';
const request = (path, cookie = '', options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { origin: base, accept: 'text/html', cookie, ...options.headers } });
const post = (path, action, cookie, fields = {}) => request(`${path}?/${action}`, cookie, { method: 'POST', body: new URLSearchParams(fields) });
async function expect(response, status) { assert.equal(response.status, status, (await response.text()).slice(0, 400)); }
async function login(email, pwd = password) { const r = await request('/login', '', { method: 'POST', body: new URLSearchParams({ email, password: pwd }) }); assert.equal(r.status, 303); return r.headers.get('set-cookie').split(';')[0]; }
const avatar = async id => (await sql`select foto_perfil from usuarios where id=${id}`)[0].foto_perfil;
async function upload(cookie, bytes, name = 'foto.png', fields = {}) { const f = new FormData(); f.append('foto', new Blob([bytes]), name); for (const [k,v] of Object.entries(fields)) f.append(k,v); return request('/perfil?/guardarFoto', cookie, { method: 'POST', body: f }); }
try {
  if (process.argv[2] === 'check') {
    const state = JSON.parse(await readFile('/var/lib/workflow/profile-test.json', 'utf8'));
    for (const actor of state.actors) {
      const cookie = await login(actor.email, state.password);
      const photo = await request('/perfil/foto', cookie); assert.equal(photo.status, 200);
      assert.equal((await avatar(actor.id)), actor.fotoPerfil);
      assert.equal((await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).width, 512);
    }
    const journal = JSON.parse(await readFile('/app/drizzle/meta/_journal.json', 'utf8'));
    assert.equal(Number((await sql`select count(*) n from drizzle.__drizzle_migrations`)[0].n), journal.entries.length);
    console.log('APROBADO: fotos, contraseña y migración conservadas después de recrear el contenedor.');
  } else {
    const admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#21b8ce' } }).png().toBuffer();
    const jpeg = await sharp(png).jpeg().toBuffer();
    const webp = await sharp(png).webp().toBuffer();
    for (const rol of ['ENCARGADO', 'MIEMBRO']) {
      const email = `perfil-${randomUUID()}@functional.local`;
      await expect(await post('/admin/usuarios', 'crear', admin, { nombre: `Prueba perfil ${rol}`, email, password, rol }), 200);
      const [actor] = await sql`select id,nombre,email,rol,departamento_id from usuarios where email=${email}`;
      actor.cookie = await login(email); actors.push(actor);
    }
    for (const action of ['guardarFoto', 'quitarFoto', 'cambiarPassword']) await expect(await post('/perfil', action, admin), 403);
    await expect(await request('/perfil/foto', admin), 403);
    assert.ok(!(await (await request('/perfil', admin)).text()).includes('Ajustes de perfil'));
    await expect(await request('/perfil/foto'), 303);
    results.push('ADMIN sin ajustes y acciones 403; anónimo sin acceso a foto');
    for (const actor of actors) {
      const cookie = actor.cookie;
      await expect(await post('/perfil', 'actualizarPerfil', cookie, { nombre: 'Cambio no permitido' }), 404);
      await expect(await post('/admin/usuarios', 'actualizar', cookie, { id: actor.id, nombre: 'Cambio no permitido', rol: actor.rol }), 303);
      assert.equal((await sql`select nombre from usuarios where id=${actor.id}`)[0].nombre, actor.nombre);
      const renamed = `${actor.nombre} por admin`;
      await expect(await post('/admin/usuarios', 'actualizar', admin, { id: actor.id, nombre: renamed, rol: actor.rol }), 200);
      assert.equal((await sql`select nombre from usuarios where id=${actor.id}`)[0].nombre, renamed);
      await expect(await request('/perfil/foto', cookie), 404);
      for (const [bytes, name] of [[Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'fake.png'], [Buffer.from('not an image'), 'bad.jpg'], [Buffer.alloc(2*1024*1024+1), 'large.png'], [Buffer.alloc(0), 'empty.png'], [await sharp({create:{width:4001,height:4001,channels:3,background:'white'}}).png().toBuffer(),'pixels.png']]) {
        await expect(await upload(cookie, bytes, name), 400); assert.equal(await avatar(actor.id), null);
      }
      await expect(await upload(cookie, png, 'foto.png', { nombre: 'Cambio oculto', rol: 'ADMIN', id: actors.find(a=>a.id!==actor.id).id }), 200);
      assert.equal((await sql`select nombre from usuarios where id=${actor.id}`)[0].nombre, renamed);
      assert.equal((await sql`select rol from usuarios where id=${actor.id}`)[0].rol, actor.rol);
      let previous = await avatar(actor.id);
      for (const bytes of [jpeg, webp]) {
        await expect(await upload(cookie, bytes), 200);
        await assert.rejects(access(`/app/uploads/avatars/${previous}`)); previous = await avatar(actor.id);
      }
      const photo = await request('/perfil/foto?id=otro&file=../../db-password', cookie);
      assert.equal(photo.status, 200); assert.equal(photo.headers.get('content-type'), 'image/webp');
      assert.equal(photo.headers.get('cache-control'), 'private, no-store'); assert.equal(photo.headers.get('x-content-type-options'), 'nosniff');
      const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
      assert.equal(metadata.width, 512); assert.equal(metadata.height, 512); assert.equal(metadata.exif, undefined);
      await expect(await post('/perfil', 'quitarFoto', cookie), 200); await assert.rejects(access(`/app/uploads/avatars/${previous}`));
      await expect(await request('/perfil/foto', cookie), 404);
      await expect(await upload(cookie, png), 200); actor.fotoPerfil = await avatar(actor.id);
      const otherSession = await login(actor.email);
      for (const fields of [{actual:'Incorrecta123!',nueva,confirmacion:nueva}, {actual:password,nueva:'corta',confirmacion:'corta'}, {actual:password,nueva,confirmacion:'NoCoincide123!'}, {actual:password,nueva:password,confirmacion:password}]) await expect(await post('/perfil', 'cambiarPassword', cookie, fields), 400);
      const changed = await post('/perfil', 'cambiarPassword', cookie, { actual:password, nueva, confirmacion:nueva });
      assert.equal(changed.status,303); assert.equal(changed.headers.get('location'),'/login?password=updated');
      for (const old of [cookie,otherSession]) assert.equal((await request('/perfil',old)).headers.get('location'),'/login');
      assert.equal((await sql`select id from sesiones where usuario_id=${actor.id}`).length,0);
      await expect(await request('/login','',{method:'POST',body:new URLSearchParams({email:actor.email,password})}),400);
      actor.cookie = await login(actor.email,nueva);
      const audit = JSON.stringify(await sql`select detalle from auditoria_usuarios where usuario_objetivo_id=${actor.id}`);
      assert.ok(!audit.includes(password) && !audit.includes(nueva) && !audit.includes('passwordHash'));
      results.push(`${actor.rol}: nombre solo admin, carga JPG/PNG/WebP, rechazo de archivos inválidos, reemplazo y eliminación de foto, contraseña y revocación de sesiones`);
    }
    const email = `perfil-delete-${randomUUID()}@functional.local`;
    await expect(await post('/admin/usuarios','crear',admin,{nombre:'Borrar avatar',email,password,rol:'MIEMBRO'}),200);
    const [target] = await sql`select id from usuarios where email=${email}`;
    await expect(await upload(await login(email), png),200); const file = await avatar(target.id);
    await expect(await post('/admin/usuarios','eliminar',admin,{id:target.id,confirmacionEmail:email}),200);
    await assert.rejects(access(`/app/uploads/avatars/${file}`));
    results.push('Eliminar cuenta retira su archivo de foto');
    await writeFile('/var/lib/workflow/profile-test.json',JSON.stringify({password:nueva,actors:actors.map(({cookie,...a})=>a)},null,2));
    await writeFile('/tmp/profile-report.json',JSON.stringify({passed:results.length,results},null,2));
    console.log(JSON.stringify({passed:results.length,results},null,2));
  }
} finally { await sql.end(); }
