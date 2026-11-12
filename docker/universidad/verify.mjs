// Ejecutar con docker exec como root únicamente sobre un contenedor de prueba.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const base = `http://localhost:${process.env.PORT || 3000}`;
const sql = postgres({ host: '127.0.0.1', username: 'admin@utslp.com', database: 'workflow',
  password: await readFile('/var/lib/workflow/db-password', 'utf8'), max: 1 });
const request = (path, cookie = '', options = {}) => fetch(base + path, {
  redirect: 'manual', ...options, headers: { origin: process.env.ORIGIN || base,
    accept: 'text/html', cookie, ...options.headers }
});
const action = (path, name, fields, cookie) => request(`${path}?/${name}`, cookie, {
  method: 'POST', body: new URLSearchParams(fields)
});
async function login(email, password) {
  const response = await request('/login', '', { method: 'POST', body: new URLSearchParams({ email, password }) });
  assert.equal(response.status, 303, 'inicio de sesión');
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie?.includes('HttpOnly') && cookie.includes('SameSite=Lax'));
  return cookie.split(';')[0];
}
const statePath = '/var/lib/workflow/verification.json';
try {
  if (process.argv[2] === 'check') {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    const [admin] = await sql`SELECT password_hash FROM usuarios WHERE email = ${state.adminEmail}`;
    assert.equal(admin.password_hash, state.adminHash, 'el bootstrap no restablece la contraseña');
    const cookie = await login(state.adminEmail, state.adminPassword);
    const [task] = await sql`SELECT estado FROM tareas WHERE id = ${state.taskId}`;
    assert.equal(task.estado, 'TERMINADA');
    const file = await request(state.filePath, cookie);
    assert.equal(file.status, 200);
    assert.equal(await file.text(), state.contents, 'adjunto conservado');
    assert.equal(Number((await sql`SELECT count(*) AS n FROM drizzle.__drizzle_migrations`)[0].n), 8);
    assert.equal(Number((await sql`SELECT count(*) AS n FROM usuarios`)[0].n), state.users);
    console.log('APROBADO: datos, contraseña, migraciones y adjuntos persisten tras reiniciar.');
  } else {
    const suffix = randomUUID();
    const initial = JSON.parse(await readFile('/var/lib/workflow/initial-admin.json', 'utf8'));
    const adminEmail = initial.email;
    const adminPassword = initial.password;
    assert.ok(adminEmail && adminPassword, 'configura las credenciales del administrador de prueba');
    const admin = await login(adminEmail, adminPassword);
    assert.equal((await request('/admin', admin)).status, 200);
    assert.equal((await request('/admin')).status, 303);
    const html = await (await request('/login')).text();
    assert.ok(!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
    const styles = [...html.matchAll(/href="(\/universidad-fonts\/[^" ]+\.css)"/g)];
    assert.ok(styles.length >= 2, 'fuentes locales incluidas');
    for (const [, path] of styles) {
      const response = await request(path);
      assert.equal(response.status, 200);
      const css = await response.text();
      assert.ok(!css.includes('https://'));
      for (const match of css.matchAll(/url\((\/universidad-fonts\/[^)]+)\)/g)) {
        assert.equal((await request(match[1])).status, 200);
      }
    }
    const departmentName = `Universidad ${suffix}`;
    assert.equal((await action('/admin/departamentos', 'crear', { nombre: departmentName }, admin)).status, 200);
    const [department] = await sql`SELECT id FROM departamentos WHERE nombre = ${departmentName}`;
    const password = 'PruebaUniversidad123!';
    const actors = {};
    for (const role of ['ENCARGADO', 'MIEMBRO']) {
      const email = `${role.toLowerCase()}-${suffix}@universidad.local`;
      assert.equal((await action('/admin/usuarios', 'crear', { nombre: role, email, password,
        rol: role, departamentoId: department.id }, admin)).status, 200);
      const [user] = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
      actors[role] = { id: user.id, cookie: await login(email, password) };
    }
    const manager = actors.ENCARGADO.cookie;
    const member = actors.MIEMBRO.cookie;
    assert.equal((await request('/admin', member)).status, 303);
    const [project] = await sql`INSERT INTO proyectos (nombre, departamento_id)
      VALUES (${`Proyecto ${suffix}`}, ${department.id}) RETURNING id`;
    const create = await action('/tareas/nueva', 'crear', { titulo: `Entrega ${suffix}`,
      descripcion: 'Prueba de contenedor autónomo', responsableId: actors.MIEMBRO.id,
      proyectoId: project.id, criterios: 'Documento adjunto',
      fechaLimite: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }, manager);
    assert.equal(create.status, 303);
    const taskPath = create.headers.get('location');
    const taskId = taskPath.split('/').at(-1);
    assert.equal((await action(taskPath, 'cambiarEstado', { estado: 'EN_PROCESO' }, member)).status, 200);
    assert.equal((await action(taskPath, 'cambiarEstado', { estado: 'EN_REVISION' }, member)).status, 400,
      'no se envía a revisión sin cumplir criterios');
    const contents = `Evidencia sin Internet ${suffix}`;
    const body = new FormData();
    body.append('archivos', new Blob([contents], { type: 'text/plain' }), 'evidencia.txt');
    assert.equal((await request(`${taskPath}?/subirArchivo`, member, { method: 'POST', body })).status, 200);
    const [file] = await sql`SELECT ruta FROM tarea_archivos WHERE tarea_id = ${taskId}`;
    assert.equal((await request(file.ruta)).status, 401);
    assert.equal(await (await request(file.ruta, member)).text(), contents);
    const [criterion] = await sql`SELECT id FROM tarea_criterios WHERE tarea_id = ${taskId}`;
    assert.equal((await action(taskPath, 'toggleCriterio', { criterioId: criterion.id }, member)).status, 200);
    assert.equal((await action(taskPath, 'cambiarEstado', { estado: 'EN_REVISION' }, member)).status, 200);
    assert.equal((await action(taskPath, 'toggleCriterio', { criterioId: criterion.id, modo: 'ENCARGADO' }, manager)).status, 200);
    assert.equal((await action(taskPath, 'cambiarEstado', { estado: 'TERMINADA' }, manager)).status, 200);
    const [account] = await sql`SELECT password_hash FROM usuarios WHERE email = ${adminEmail}`;
    await writeFile(statePath, JSON.stringify({ adminEmail, adminPassword, adminHash: account.password_hash,
      taskId, filePath: file.ruta, contents, users: Number((await sql`SELECT count(*) AS n FROM usuarios`)[0].n) }), { mode: 0o600 });
    console.log('APROBADO: login, permisos, departamentos, usuarios, proyecto, tarea, revisión, adjuntos y fuentes locales.');
  }
} finally { await sql.end(); }
