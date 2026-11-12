# Tezcat Workflow

Plataforma de proyectos y tareas con SvelteKit y PostgreSQL 16.

## Iniciar sin configurar nada

Con Docker funcionando, abre una terminal en esta carpeta y copia este bloque.
Funciona con los mismos comandos en PowerShell, Linux y macOS (Docker Compose v2,
motor Linux):

```text
docker compose -p workflow-unico up -d --build --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

El primer comando construye e inicia **un solo contenedor** con la web, el backend
y PostgreSQL. El segundo espera a que esté listo y muestra las credenciales de demostración. Abre **http://localhost:3000**. No necesitas `.env`, Node, Python,
pnpm ni PostgreSQL instalados en el anfitrión.

Desde otra máquina usa `http://IP_DEL_EQUIPO:3000` si el firewall permite el acceso.
Repetir el bloque reutiliza el contenedor sin restablecer sus datos o contraseña.
Las migraciones están en la imagen; no se monta el repositorio ni SMB.

**Persistencia:** las instalaciones nuevas guardan PostgreSQL, credenciales y
adjuntos en el volumen Docker `workflow_data`. Los datos sobreviven a la
recreación si se reutiliza ese volumen. No elimines el volumen. El bloque usa
`--no-recreate` y no actualiza contenedores anteriores automáticamente.

Si ya tenías un contenedor de fase 2 sin volumen, conserva ese contenedor:
esta versión no copia ni migra sus datos automáticamente. Consulta la guía
antes de recrearlo.

Consulta [la guía Docker](DOCKER_DEPLOYMENT.md) y el
[informe de persistencia](docker/universidad/FASE3_VALIDACION.md).

## Entrega al profesor sin código fuente

Prepara la imagen TAR siguiendo el [método B de la guía](DOCKER_DEPLOYMENT.md#fase-4--método-b-entregar-una-imagen-sin-repositorio)
y entrega el TAR junto a los dos archivos de [docker/portable](docker/portable).
El profesor abre una terminal en la carpeta recibida y copia:

```text
docker load -i workflow-2026.11.12.tar
docker compose -p workflow-unico up -d --no-build --pull never --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

No compila ni descarga dependencias. Usa un contenedor y el volumen workflow_data.
El TAR contiene la aplicación; los datos existentes requieren respaldo aparte.
Para construir directamente desde SMB, consulta el método A de la misma guía.
Resultados y límites: [validación de fase 4](docker/universidad/FASE4_VALIDACION.md)
y [prueba real de SMB en Proxmox](docker/universidad/SMB_VALIDACION_VM.md).

## Credenciales de demostración

| Servicio | Usuario | Contraseña |
| --- | --- | --- |
| Aplicación (administrador) | `admin@utslp.com` | `Pass123456` |
| PostgreSQL (base `workflow`) | `admin@utslp.com` | `Pass123456` |

Son credenciales públicas para la evaluación académica. PostgreSQL solo escucha
dentro del contenedor en el puerto 5432; no se publica al anfitrión.
Se aplican a instalaciones nuevas. El comando `--no-recreate` conserva el
contenedor anterior y sus credenciales; no restablece cuentas existentes.

## Desarrollo y verificación

Para desarrollo se necesitan Node.js 22, pnpm 11 y un PostgreSQL independiente.
Configura DATABASE_URL, instala con `pnpm install --frozen-lockfile`, aplica
`pnpm db:migrate` y crea el administrador con `pnpm db:bootstrap` (requiere
ADMIN_EMAIL y ADMIN_PASSWORD). Este comando ya no restablece cuentas existentes.
`pnpm dev` inicia Vite; `pnpm check` valida Svelte y `pnpm build` compila.
Las suites `pnpm test`, `pnpm test:sprint4` y `pnpm test:muro` necesitan una base
y aplicación de prueba; no deben ejecutarse sobre datos reales.

## Funciones del sprint

- TW-01: contraseñas Argon2id, bloqueo temporal tras cinco intentos fallidos, sesiones con token aleatorio y hash almacenado en la base, cookie HttpOnly/SameSite, revocación al cerrar sesión y rechazo de cuentas inactivas.
- TW-02: alta, edición y activación/desactivación de usuarios; roles ADMIN, ENCARGADO y MIEMBRO; alta y edición de departamentos; auditoría transaccional de cambios. Solo ADMIN ejecuta acciones administrativas.
- TW-03: loader de servidor con widgets y métricas filtradas por rol. El encargado ve solo el conteo de cuentas activas de su departamento.

Las métricas de tareas y proyectos pertenecen a sprints posteriores, cuando existan esas tablas y reglas de autorización por recurso.

## Etiquetas y muro de tareas opcionales

La migración `0007_etiquetas_muro` crea el catálogo de etiquetas por departamento y su relación con las tareas. Se aplica con `pnpm db:migrate` o automáticamente al arrancar el contenedor Docker. Conserva los datos existentes.

El administrador crea, edita y desactiva etiquetas persistentes. El encargado publica tareas opcionales sin responsable y selecciona etiquetas activas de su departamento. En `/muro`, los miembros del mismo departamento pueden leer la descripción completa y tomar una tarea; los encargados pueden convertirla en obligatoria eligiendo un miembro activo. Las tareas tomadas o convertidas salen del muro y aparecen en las tareas del responsable. La asignación y su evento se guardan en una transacción que impide asignaciones simultáneas.

Para verificar estos flujos con una instancia local en ejecución, define `DATABASE_URL` y opcionalmente `TEST_BASE_URL` (por defecto `http://localhost:3001`) y ejecuta `pnpm test:muro`. La prueba crea cuentas y departamentos temporales y los elimina al terminar; cubre persistencia, permisos, aislamiento entre departamentos y concurrencia.

Documentación detallada: [Cambios de etiquetas y muro](docs/cambios-etiquetas-muro.md).

Las tareas opcionales permiten definir EXP y monedas. El detalle muestra sus etiquetas, recompensas e información adicional. Al aprobar la tarea se acreditan los importes una sola vez al responsable; el usuario consulta sus saldos en `/perfil`. Se reutilizan las tablas existentes de movimientos, sin otra migración para recompensas.
