// Ejecutar con docker exec: muestra credenciales en la terminal, nunca en logs.
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
const port = process.env.PORT || 3000;
let ready = false;
for (let attempt = 0; attempt < 120; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/login`, { signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch {}
  await setTimeout(1000);
}
if (!ready) throw new Error('Workflow no está listo. Consulta docker logs workflow.');
const initial = JSON.parse(await readFile('/var/lib/workflow/initial-admin.json', 'utf8'));
console.log('Workflow listo. Abre http://localhost:3000 (o la IP del equipo Docker).');
console.log(`Correo inicial: ${initial.email}`);
console.log(`Contraseña inicial: ${initial.password}`);
console.log('Si ya cambiaste la contraseña en la aplicación, utiliza la nueva.');
