# Workflow: Docker en un solo contenedor

## Inicio automático para el profesor

Con Docker funcionando en modo de contenedores Linux, abre una terminal en la
carpeta del repositorio y copia este bloque completo. Los mismos comandos sirven
en Windows (PowerShell), Linux y macOS:

```text
docker compose -p workflow-unico up -d --build --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

No necesitas editar archivos ni instalar Node, pnpm, Python o PostgreSQL.
La primera ejecución construye la imagen, configura las credenciales de demostración, crea
la base de datos y el administrador, aplica migraciones y espera a que la web
esté lista. La terminal muestra el correo y la contraseña inicial. Abre
http://localhost:3000. Desde otra máquina de la red usa http://IP_DEL_EQUIPO:3000.
El firewall del anfitrión debe permitir el acceso; el script no modifica el firewall.

Solo se crea **un contenedor `app`**, con frontend, backend y PostgreSQL 16.
`--no-recreate` reutiliza el contenedor existente; repetir el bloque no borra sus
datos ni cambia sus contraseñas. Tampoco actualiza un contenedor existente:
para actualizar una instalación que ya usa el volumen, sigue el procedimiento
de persistencia de esta guía.
Si el puerto 3000 está ocupado, Docker lo informa; no se detienen servicios ajenos.
Docker Compose v2 es requisito (incluido en Docker Desktop).

## Credenciales y red

La aplicación y PostgreSQL usan por defecto el usuario `admin@utslp.com` y la
contraseña `Pass123456`. La base se llama `workflow`. Son credenciales públicas
para demostración académica, aplicadas al inicializar una instalación nueva.
Se guarda en `/var/lib/workflow/initial-admin.json`, legible solo por root del
contenedor. Los valores predeterminados están publicados en el código y el README. El archivo
de ejecución no se versiona y el arranque no imprime contraseñas en los logs.
El comando `access.mjs` la muestra explícitamente en la terminal. Si cambias la
contraseña en la aplicación, utiliza la nueva; ese archivo no es un restablecimiento.
Quien administra Docker tiene acceso a los datos del contenedor.

El servidor HTTP deriva el origen del Host de cada petición, sobreescribe su
cabecera interna de protocolo y mantiene la protección CSRF de SvelteKit. Así
funciona con localhost, IP o nombre de la máquina sin configurar ORIGIN.
No confía en las cabeceras de protocolo enviadas por el cliente.
El modo automático es una demostración HTTP en una red de confianza.
Para HTTPS tras un proxy administrado, configura ORIGIN con la URL HTTPS y
WORKFLOW_LOCAL_HTTP=false mediante variables de ejecución.
ADMIN_EMAIL y ADMIN_PASSWORD también son opcionales para personalizar el primer
arranque con `docker run -e`; no se necesitan para el bloque automático.

## Imagen independiente del repositorio

```text
docker build -t workflow:local .
docker volume create workflow_data
docker run -d --name workflow --stop-timeout 45 --mount type=volume,source=workflow_data,target=/var/lib/workflow -p 3000:3000 workflow:local
docker exec workflow node docker/universidad/access.mjs
```

Esta alternativa no debe ejecutarse simultáneamente con Compose en el mismo
puerto. Una vez construida/cargada la imagen, los dos últimos comandos no necesitan
el repositorio. No se montan `drizzle`, `node_modules` ni carpetas SMB.
El Dockerfile universitario conserva el mismo contenido que el de la raíz.

La construcción instala dependencias con lockfile y compila dentro de Docker.
Incluye frontend, backend, dependencias de producción, migraciones y fuentes.
El contexto excluye secretos, volcados, adjuntos y dependencias del anfitrión.
Necesita Internet durante la construcción, no durante el arranque.
Las etiquetas base y paquetes del sistema no están fijados por digest/versión:
no se garantiza una reconstrucción idéntica byte a byte.

## Procesos y arranque

`tini` recoge procesos huérfanos; el supervisor prepara permisos internos y
arranca PostgreSQL como `postgres` y Node como `node`. Solo el supervisor necesita
root. PostgreSQL escucha en loopback interno, sin puerto publicado.
Las ocho migraciones se aplican antes de iniciar la web. El bootstrap usa una
marca transaccional para no restablecer la cuenta inicial. Si falla una migración,
la web no arranca. Si falla un proceso crítico, el otro se detiene y el contenedor
termina con error. El apagado permite 45 segundos.

El archivo `docker-compose.migrate.yml` se mantiene como capa vacía de
compatibilidad: el comando antiguo de dos archivos también define un solo servicio.
La comunicación de tareas es HTTP con actualización cada 12 segundos;
no hay WebSockets implementados actualmente.

## Persistencia: fase 3

Compose crea automáticamente un volumen administrado llamado `workflow_data`
y lo monta en `/var/lib/workflow`. No es otro contenedor y no depende de SMB.
El volumen vive en el almacenamiento del motor Docker y tiene un ciclo de vida
independiente de la imagen y del contenedor.

| Datos | Ruta dentro del volumen |
| --- | --- |
| PostgreSQL 16: usuarios, hashes, sesiones, proyectos, tareas, mensajes, configuración y demás tablas | `postgres/` |
| Adjuntos físicos | `uploads/` |
| Contraseña interna PostgreSQL | `db-password` |
| Credenciales iniciales del administrador | `initial-admin.json` |

La ruta histórica `/app/uploads` es un enlace interno al directorio persistente;
no cambia las URLs ni la lógica de adjuntos. Las migraciones aplicadas y la marca
de bootstrap permanecen en PostgreSQL. El arranque solo ejecuta initdb si el
directorio está vacío, rechaza datos parciales sin PG_VERSION y versiones mayores
distintas de 16, y no regenera una contraseña perdida de una base existente.
Un bloqueo exclusivo impide arrancar dos instancias sobre el mismo volumen.
Las migraciones pendientes se aplican con el registro Drizzle; si fallan no se
inicia la web. No se ejecuta db:push ni se borran tablas o restablecen cuentas.

### Actualizar o recrear una instalación con volumen

Antes de actualizar, comprueba que el contenedor tiene el volumen esperado:

```text
docker inspect workflow-unico-app-1 --format '{{json .Mounts}}'
```

Debe mostrar Type=volume, Name=workflow_data y Destination=/var/lib/workflow.
Si no aparece ese montaje, NO sigas este procedimiento: es una instalación
anterior sin persistencia y requiere una transferencia explícita de datos.
Conserva también un respaldo consistente antes de actualizar datos importantes;
la automatización de respaldos se implementará en la fase 5.

Para una instalación con ese volumen, reconstruir y recrear mantiene los datos:

```text
docker compose -p workflow-unico up -d --build --force-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

También puedes detener y eliminar únicamente el contenedor con Compose y volver
a levantarlo: `docker compose -p workflow-unico down` (sin opción de volúmenes)
seguido del bloque de inicio. Nunca elimines `workflow_data`, ni uses eliminación
de volúmenes o limpieza global. Ningún script del proyecto elimina volúmenes.
Cambiar de imagen debe mantener PostgreSQL 16 y migraciones compatibles; volver
a una imagen antigua tras migrar el esquema no es un rollback garantizado.

### Instalaciones anteriores y varias copias

Esta fase no importa automáticamente datos de contenedores sin volumen ni del
antiguo `postgres_data`. No recrees esos contenedores para añadir el montaje:
el nuevo volumen estaría vacío. Conserva la instancia original hasta preparar
una transferencia consistente de base, archivos y configuración; no se han
migrado datos reales durante este trabajo.

El nombre `workflow_data` es estable aunque cambie el nombre del proyecto Compose.
Solo una instancia puede usarlo a la vez. Para pruebas independientes se puede
establecer opcionalmente WORKFLOW_VOLUME_NAME con otro nombre; el profesor no
necesita configurar esa variable. No apuntes ese volumen a un controlador SMB.

Para detener, iniciar y consultar logs sin recrear:

```text
docker compose -p workflow-unico stop
docker compose -p workflow-unico start
docker compose -p workflow-unico logs app
```

## SMB y límites de compatibilidad

Se eliminó `./drizzle:/app/drizzle:ro`, una dependencia real de archivos externos.
No se ha reproducido el fallo original del profesor en SMB. Durante la
construcción Docker necesita leer el contexto; durante la ejecución no necesita
la carpeta compartida. Los cambios de permisos se aplican dentro del contenedor.
No montes PostgreSQL sobre SMB.

El flujo usa comandos Docker comunes a Windows, Linux y macOS con motor Linux.
La prueba realizada es Linux amd64 sobre Docker Desktop en Windows; macOS,
Linux nativo y ARM64 quedan pendientes de validación real. No se garantiza
compatibilidad con cualquier hardware ni con el modo Windows containers.
