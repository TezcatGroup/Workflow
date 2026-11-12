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

## Fase 4 — Método A: construir desde una carpeta SMB

La carpeta debe estar ya accesible para el usuario que ejecuta Docker. No se
configura Samba ni se cambian los permisos del recurso compartido. Abre una
terminal en la raíz de Workflow dentro de esa carpeta y ejecuta:

```text
docker build -t workflow:2026.11.12 .
```

En PowerShell puedes entrar con `Set-Location '\\servidor\recurso\Workflow'`;
en Linux/macOS usa `cd /ruta/del/recurso/Workflow`, con la ruta real ya montada.
Estos son ejemplos de rutas, no requisitos de nombre del servidor.

Docker necesita leer Dockerfile, manifiestos, código y migraciones del contexto.
Las instrucciones COPY los incorporan al build; la instalación de dependencias,
compilación, escritura de fuentes y cambios de permisos suceden en las capas de
Docker, no en SMB. El .dockerignore limita lo que se lee y transfiere. No ejecutes
pnpm install ni chmod/chown sobre la carpeta compartida.

Después de construir, inicia con el volumen administrado, sin montar el recurso:

```text
docker volume create workflow_data
docker run -d --name workflow --restart unless-stopped --stop-timeout 45 --mount type=volume,source=workflow_data,target=/var/lib/workflow -p 3000:3000 workflow:2026.11.12
docker exec workflow node docker/universidad/access.mjs
```

No ejecutes este bloque si ya tienes otra instancia en ese puerto o volumen.
Para un contenedor ya creado usa `docker start workflow`.

La lectura desde SMB puede fallar por credenciales del recurso, permisos de
lectura, desconexiones, archivos no disponibles localmente o restricciones del
cliente/contexto Docker. Los fallos al descargar paquetes son distintos de SMB.
Conserva el error exacto de `docker build --progress=plain` para distinguirlos.
No se ha reproducido el entorno del profesor: el montaje de drizzle eliminado
era una dependencia real, pero no es una causa confirmada de su fallo.
Si el contexto no puede leerse de forma fiable, usa el método B.

## Fase 4 — Método B: entregar una imagen, sin repositorio

### Preparación en el equipo que construye

1. Copia o clona la rama Docker en un disco local. Si usas Git:

   ```text
   git clone --branch Docker https://github.com/TezcatGroup/Workflow.git Workflow-local
   cd Workflow-local
   ```

2. Comprueba la arquitectura del motor receptor con `docker info --format
   '{{.OSType}}/{{.Architecture}}'`. Docker debe usar contenedores Linux.
   En la máquina de construcción, para un receptor Intel/AMD de 64 bits:

   ```text
   docker build --platform linux/amd64 -t workflow:2026.11.12 .
   docker image inspect workflow:2026.11.12 --format '{{.Os}}/{{.Architecture}}'
   ```

   Para un receptor ARM64, construye con `--platform linux/arm64`; requiere soporte
   de construcción para esa plataforma. El TAR amd64 no se convierte en ARM al
   copiarlo. No se ha validado ARM64 en este trabajo.

3. Crea una carpeta de entrega nueva en un disco local, fuera del repositorio.
   Copia allí `docker/portable/compose.yaml` y `docker/portable/LEEME.md`.
   Abre una terminal en esa carpeta y exporta:

   ```text
   docker save -o workflow-2026.11.12.tar workflow:2026.11.12
   ```

   Usa un directorio nuevo y no sobrescribas un TAR anterior. Mantén juntos la
   etiqueta de la imagen, el nombre del TAR y la imagen declarada en compose.yaml.
   Para futuras versiones, cambia los tres nombres de forma consistente.

4. Comprueba el archivo antes y después de transferirlo. En PowerShell:

   ```powershell
   Get-FileHash -Algorithm SHA256 workflow-2026.11.12.tar
   ```

   En Linux: `sha256sum workflow-2026.11.12.tar`.
   En macOS: `shasum -a 256 workflow-2026.11.12.tar`.
   Los hashes deben coincidir. El hash detecta cambios en la transferencia;
   no sustituye la confianza en quien entrega la imagen.

5. Transfiere la carpeta por SMB, USB u otro medio. En el receptor, copia los
   archivos a un disco local antes de importar. No hace falta transferir src,
   node_modules, Dockerfile, .env ni el resto del repositorio.

### Ejecución en la máquina del profesor

Desde la carpeta recibida, copia este bloque completo. No requiere configuración:

```text
docker load -i workflow-2026.11.12.tar
docker compose -p workflow-unico up -d --no-build --pull never --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

Compose no contiene build y prohíbe descargar la imagen. Si load falla, detente
antes de continuar. El acceso sigue siendo http://localhost:3000 y las credenciales
son admin@utslp.com / Pass123456 para una base nueva. Solo se crea un contenedor,
y el volumen workflow_data se crea o reutiliza. No se borran ni importan datos
existentes automáticamente. El bloque no actualiza un contenedor ya creado.

Para comprobarlo:

```text
docker compose -p workflow-unico ps
docker compose -p workflow-unico exec -T app node docker/universidad/healthcheck.mjs
docker inspect workflow-unico-app-1 --format '{{json .Mounts}}'
```

Se espera una aplicación saludable y un montaje de tipo volume hacia
/var/lib/workflow; ninguna ruta al repositorio ni a SMB. Después de importar,
la imagen permanece en Docker y la aplicación puede arrancar sin el TAR ni el
recurso compartido. La alternativa docker run está en el LEEME de entrega.

**El TAR exporta la imagen, no el volumen ni los datos de una instalación.**
No uses docker export/import para este procedimiento: se necesitan save/load
para conservar la imagen y su configuración. La transferencia de datos existentes
se resolverá mediante respaldo/restauración en la fase 5. No se publicó la imagen
en ningún registro externo.

Referencias: [contexto de construcción](https://docs.docker.com/build/concepts/context/),
[docker save](https://docs.docker.com/reference/cli/docker/image/save/) y
[docker load](https://docs.docker.com/reference/cli/docker/image/load/).
