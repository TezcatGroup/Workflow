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
la actualización segura se completará con la persistencia de la fase 3.
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
docker run -d --name workflow --stop-timeout 45 -p 3000:3000 workflow:local
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

## Estado de persistencia: fase 2

**Todavía no se ha implementado la fase 3.** Los datos sobreviven al reinicio del
mismo contenedor, pero no a su eliminación. No uses `docker compose down`,
`--force-recreate` ni elimines contenedores con datos importantes.
PostgreSQL está en `/var/lib/workflow/postgres`, su clave interna en
`/var/lib/workflow/db-password` y los adjuntos en `/app/uploads`.
El antiguo volumen `postgres_data` no se importa ni elimina automáticamente.
La fase 3 reunirá los datos en `workflow_data`; respaldos y restauración se
implementarán en su fase correspondiente.

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
