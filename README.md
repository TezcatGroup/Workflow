# Tezcat Workflow

## Despliegue Docker en un solo comando

Para construir la aplicación, iniciar PostgreSQL, aplicar automáticamente todas las migraciones Drizzle, crear o actualizar el administrador inicial y levantar la aplicación, ejecuta desde la raíz del repositorio:

```bash
docker compose -f docker-compose.yml -f docker-compose.migrate.yml up -d --build
```

El servicio `migrate` espera a que PostgreSQL esté saludable y debe finalizar correctamente antes de que arranque `app`. Para una instalación de evaluación sin `.env`, el archivo adicional usa `tezcat` / `PostgresPassword123!` para PostgreSQL y crea el administrador `admin@admin.com` con la contraseña `AdminPassword123!`.

Estas credenciales son públicas y se incluyen únicamente para facilitar el primer despliegue. Antes de exponer la aplicación, define valores propios (por ejemplo, en `.env`) para `POSTGRES_PASSWORD`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`; la contraseña del administrador debe tener al menos 12 caracteres. Puedes comprobar el estado y consultar la migración con:

```bash
docker compose -f docker-compose.yml -f docker-compose.migrate.yml ps
docker compose -f docker-compose.yml -f docker-compose.migrate.yml logs migrate
```

Aplicación SvelteKit con TypeScript, Tailwind, Drizzle ORM y PostgreSQL 16. Implementa TW-01 (acceso y sesiones), TW-02 (usuarios, roles, departamentos y auditoría) y TW-03 (dashboard por rol).

## Requisitos

- Windows: instalar Docker Desktop con `winget install --id Docker.DockerDesktop --exact` o desde [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/). Activar WSL 2 con `wsl --install` en PowerShell como administrador y reiniciar cuando Windows lo solicite. Abrir Docker Desktop y esperar a que `docker version` muestre tanto Client como Server.
- Node.js 22 y pnpm 11 para los comandos de desarrollo. `npm install -g pnpm@11.19.0` instala pnpm. Docker construye la aplicación con su propio Node.js; Node local solo se usa para sincronizar el esquema, crear el administrador y ejecutar las pruebas.
- Git para clonar el repositorio.

## Despliegue automatizado en Linux

El script `setup-workflow.sh` configura `.env`, levanta PostgreSQL, construye la imagen, aplica las migraciones Drizzle, ejecuta el bootstrap del administrador y levanta la aplicación. También añade de forma idempotente `workflow.tezcatgroup.com` → `http://127.0.0.1:3000` a `~/.cloudflared/tezcatweb.yml`, valida el ingress y reinicia `cloudflared-tezcatweb.service`.

Modo interactivo (los secretos se leen sin mostrarlos):

```bash
./setup-workflow.sh
```

Modo automatizado, recomendado con secretos proporcionados por el entorno:

```bash
POSTGRES_PASSWORD='secreto-url-safe-de-16-o-mas' \
ADMIN_PASSWORD='clave-url-safe-de-12-o-mas' \
ADMIN_EMAIL='admin@tezcatgroup.com' \
./setup-workflow.sh --non-interactive
```

También se pueden generar los secretos que falten con `./setup-workflow.sh --non-interactive --generate-secrets`. El script no muestra los valores generados; quedan guardados únicamente en `.env` con permisos `600`. Use `--skip-tunnel` para desplegar sin tocar Cloudflare. Se pueden personalizar `ENV_FILE`, `CLOUDFLARED_CONFIG`, `CLOUDFLARED_SERVICE`, `WORKFLOW_HOSTNAME`, `WORKFLOW_ORIGIN` y `PUBLIC_ORIGIN` mediante variables de entorno.

> La regla DNS del hostname debe existir en Cloudflare y apuntar al túnel `tezcatweb`; el script administra el ingress local, no crea ni modifica registros DNS.

## Configuración inicial con Docker

1. Clonar el repositorio y entrar a su carpeta.
2. Copiar `.env.example` a `.env`. Cambiar `POSTGRES_PASSWORD` y `ADMIN_PASSWORD`. Usar un secreto alfanumérico para `POSTGRES_PASSWORD`, de forma que pueda utilizarse directamente en `DATABASE_URL`; sustituir ese valor también en la URL. `.env` está excluido de Git.
3. Ejecutar `pnpm install`.
4. Ejecutar `docker compose up -d db` y comprobar `docker compose ps`. Esperar `healthy`.
5. Ejecutar `pnpm db:migrate` para aplicar la migración versionada de `drizzle/` y crear `departamentos`, `usuarios`, `sesiones`, `auditoria_usuarios` y el enum `rol_usuario`. `pnpm db:push` queda reservado para sincronización rápida durante desarrollo local.
6. Si se requieren los datos completos de la instancia universitaria de prueba, importarlos **antes** de crear el administrador:

   ```powershell
   Get-Content -Raw -Encoding UTF8 database/tezcat_workflow_data.sql | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U tezcat -d tezcat_workflow
   ```

   Este paso es opcional para una instalación limpia y se ejecuta una sola vez en una base sin filas. El archivo contiene las cuatro tablas pobladas: 8 departamentos, 26 usuarios, 29 sesiones y 54 eventos de auditoría al momento de la exportación. Incluye hashes de contraseñas y tokens de sesión de prueba; no usar esta copia como base de producción.
7. Ejecutar `pnpm db:bootstrap` para crear o actualizar el administrador indicado en `ADMIN_EMAIL` con `ADMIN_PASSWORD`. Si se importó el volcado, este comando establece una contraseña nueva para el administrador inicial y reactiva su cuenta. Volver a ejecutarlo restablece esa contraseña.
8. Ejecutar `docker compose up -d --build app` y abrir `http://localhost:3000/login`.
9. Ejecutar `pnpm db:studio` para inspeccionar la base en la dirección indicada por Drizzle Studio.

El directorio `database/` incluye una exportación SQL del esquema real de PostgreSQL 16, un volcado de **todos los datos** de la instancia de prueba y un seed mínimo opcional para departamentos. La migración de Drizzle sigue siendo la forma recomendada de crear las tablas. Si se prefiere únicamente el seed mínimo en vez del volcado completo, cargarlo después del paso 5 con PowerShell:

```powershell
Get-Content -Raw -Encoding UTF8 database/seed_departamentos.sql | docker compose exec -T db psql -U tezcat -d tezcat_workflow
```

Si se desea restaurar el esquema desde el respaldo SQL en una base **vacía**, en lugar de `pnpm db:migrate`, ejecutar:

```powershell
Get-Content -Raw -Encoding UTF8 database/tezcat_workflow_schema.sql | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U tezcat -d tezcat_workflow
```

Los comandos asumen los valores predeterminados `POSTGRES_USER=tezcat` y `POSTGRES_DB=tezcat_workflow`; si se modifican en `.env`, sustituirlos también en los comandos. No aplicar el respaldo de esquema sobre una base que ya tenga las tablas ni importar el volcado de datos dos veces. `.env` no se publica: contiene los secretos propios de cada instalación. Para una base real, partir del esquema vacío y crear cuentas nuevas en lugar de importar la muestra universitaria.

`docker compose down` detiene los servicios y conserva el volumen `postgres_data`. El archivo Compose publica PostgreSQL únicamente en `127.0.0.1:5433`, para que los comandos locales puedan conectarse sin chocar con una instalación local en 5432. La aplicación usa `db:5432` dentro de la red de Compose. No ejecutar `docker compose down -v` salvo que se quiera borrar la base de datos.

## Desarrollo y verificación

Con la base de datos levantada y el esquema sincronizado:

```powershell
pnpm dev
pnpm check
pnpm build
pnpm test
```

`pnpm test` requiere la aplicación en `http://127.0.0.1:5173` y ejecuta los ocho casos TC-01 a TC-08 contra PostgreSQL. Para probar el contenedor en el puerto 3000, usar `TEST_BASE_URL=http://localhost:3000`. Cada ejecución crea cuentas y un departamento de prueba con sufijo aleatorio; no inserta contraseñas en el repositorio.

Para una demostración **solo en desarrollo local**, se puede definir `DEMO_ADMIN_PASSWORD` en `.env` y ejecutar `pnpm db:demo-admin`. Con `pnpm dev`, el usuario de acceso es `admin` y la contraseña es el valor configurado. Este alias no funciona en el build de producción. No usar una contraseña corta fuera de una demostración local.

## Funciones del sprint

- TW-01: contraseñas Argon2id, bloqueo temporal tras cinco intentos fallidos, sesiones con token aleatorio y hash almacenado en la base, cookie HttpOnly/SameSite, revocación al cerrar sesión y rechazo de cuentas inactivas.
- TW-02: alta, edición y activación/desactivación de usuarios; roles ADMIN, ENCARGADO y MIEMBRO; alta y edición de departamentos; auditoría transaccional de cambios. Solo ADMIN ejecuta acciones administrativas.
- TW-03: loader de servidor con widgets y métricas filtradas por rol. El encargado ve solo el conteo de cuentas activas de su departamento.

Las métricas de tareas y proyectos pertenecen a sprints posteriores, cuando existan esas tablas y reglas de autorización por recurso.
