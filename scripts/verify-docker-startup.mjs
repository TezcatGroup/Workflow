// Requiere Docker y una imagen construida; solo crea recursos con nombres únicos.
// Conserva contenedores detenidos y volúmenes de prueba para inspección.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const exec = promisify(execFile);
const image = process.argv[2] || 'workflow:local';
const prefix = `workflow-startup-${randomUUID().slice(0, 8)}`;
const containers = [], volumes = [];
async function docker(...args) {
  const result = await exec('docker', args, { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  return (args[0] === 'logs' ? result.stdout + result.stderr : result.stdout).trim();
}
async function waitFor(name, healthy) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const state = JSON.parse(await docker('inspect', '--format', '{{json .State}}', name));
    if (healthy && state.Health?.Status === 'healthy') return;
    if (state.Status === 'exited') {
      if (healthy) throw new Error(await docker('logs', name));
      assert.equal(state.ExitCode, 1);
      return;
    }
    await setTimeout(1000);
  }
  throw new Error(`Tiempo excedido: ${name}`);
}
async function run(name, volume, env) {
  await docker('run', '-d', '--network', 'none', '--name', name,
    '--mount', `type=volume,source=${volume},target=/var/lib/workflow`,
    ...env.flatMap(value => ['-e', value]), image);
  containers.push(name);
}
try {
  for (const [label, invalid] of [['database', 'POSTGRES_PASSWORD=short'], ['admin', 'ADMIN_PASSWORD=short']]) {
    const volume = `${prefix}-${label}`;
    await docker('volume', 'create', volume);
    volumes.push(volume);
    const failed = `${volume}-invalid`, corrected = `${volume}-corrected`;
    await run(failed, volume, [invalid]);
    await waitFor(failed, false);
    const logs = await docker('logs', failed);
    assert.match(logs, /debe tener|de al menos/);
    // Mismo volumen: corregir la configuración debe bastar, sin borrar datos.
    await run(corrected, volume, ['ADMIN_EMAIL=regression@workflow.local', 'ADMIN_PASSWORD=RegressionDocker123!']);
    await waitFor(corrected, true);
    await docker('exec', corrected, 'node', 'docker/universidad/verify.mjs');
    await docker('stop', '-t', '45', corrected);
    await docker('start', corrected);
    await waitFor(corrected, true);
    await docker('exec', corrected, 'node', 'docker/universidad/verify.mjs', 'check');
    console.log(`PASS ${label}: rechazo recuperable, administrador, funciones sin red y persistencia`);
  }
} finally {
  for (const name of containers) {
    await docker('stop', '-t', '45', name).catch(error => console.error(`No se pudo detener ${name}: ${error.message}`));
  }
  console.log(JSON.stringify({ containers, volumes }, null, 2));
}
