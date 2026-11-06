# Workflow universidad: un único contenedor

Esta modalidad incluye frontend compilado, backend SvelteKit/Node.js 22,
PostgreSQL 16, migraciones Drizzle, fuentes e iconos locales y archivos adjuntos.
No requiere Compose, `.env`, carpetas montadas, volúmenes ni otros servicios.
El Dockerfile y los archivos Compose originales siguen disponibles.

## Construcción y ejecución

Desde la raíz del repositorio, con Docker funcionando:

```bash
docker build -f docker/universidad/Dockerfile -t workflow:universidad .
```

Después, levantar todo con **un solo comando**:

```bash
docker run -d --name workflow-universidad -p 3000:3000 workflow:universidad
```

Abrir [http://localhost:3000](http://localhost:3000). El primer arranque inicializa
PostgreSQL, aplica las ocho migraciones actuales y crea el administrador:

- Correo: `admin@universidad.local`
- Contraseña: `WorkflowUniversidad123!`

Son credenciales públicas de demostración, no de producción. Para acceso solo
desde el equipo local se puede usar `-p 127.0.0.1:3000:3000`.
La construcción necesita Internet para paquetes y fuentes; el arranque no descarga nada.
Las funciones locales no necesitan Internet. Los enlaces externos que los usuarios
añadan como evidencias sí requieren acceso al destino si se abren.

## Configuración opcional

Pasar variables con `docker run -e NOMBRE=valor ...`:

| Variable | Valor predeterminado / comportamiento |
| --- | --- |
| `ADMIN_EMAIL` | `admin@universidad.local`; solo en la primera inicialización |
| `ADMIN_PASSWORD` | `WorkflowUniversidad123!`; mínimo 12 caracteres; solo inicialmente |
| `POSTGRES_PASSWORD` | Se genera aleatoriamente y se guarda dentro del contenedor; solo inicialmente |
| `ORIGIN` | `http://localhost:3000`; debe coincidir con la dirección del navegador |
| `PORT` | `3000`; actualizar también el mapeo de puertos si se cambia |
| `BODY_SIZE_LIMIT` | `12M` |
| `WORKFLOW_LOCAL_HTTP` | `true` solo en esta imagen, permite cookies de sesión sobre HTTP local |

PostgreSQL usa la base y el usuario `workflow`, sin privilegios de superusuario.
La conexión de la aplicación se configura internamente; `DATABASE_URL` externo no
se utiliza en esta modalidad. Cambiar las variables después de inicializar no
restablece contraseñas ni crea otros administradores. Cambiar contraseñas de usuarios
desde las funciones de administración de la aplicación.

Para otro puerto del anfitrión, por ejemplo, usar `-p 8080:3000 -e ORIGIN=http://localhost:8080`.
Para un despliegue HTTPS, establecer `WORKFLOW_LOCAL_HTTP=false` y el `ORIGIN` HTTPS.
El despliegue original conserva por defecto sus cookies seguras en producción.

## Operación y persistencia

```bash
docker logs -f workflow-universidad
docker inspect --format '{{.State.Health.Status}}' workflow-universidad
docker stop -t 45 workflow-universidad
docker start workflow-universidad
docker restart -t 45 workflow-universidad
```

El mismo contenedor conserva usuarios, contraseñas, proyectos, tareas y adjuntos
al detenerse y arrancar. PostgreSQL guarda los datos en `/var/lib/workflow/postgres`
y los adjuntos en `/app/uploads`, en la capa escribible del contenedor.
No se declara ningún volumen, ni siquiera anónimo.

Para eliminarlo intencionalmente, detenerlo primero y ejecutar:

```bash
docker rm workflow-universidad
```

**Eliminar y recrear el contenedor pierde los datos y adjuntos.** Una imagen guardada
con `docker save` contiene la aplicación, no los datos creados durante la ejecución.
No utilizar `--rm` si se desea conservar el contenedor después de detenerlo.

## Verificar PostgreSQL

```bash
docker exec -u postgres workflow-universidad psql -d workflow -c "SELECT count(*) FROM usuarios;"
docker exec -u postgres workflow-universidad psql -d workflow -c "SELECT count(*) FROM drizzle.__drizzle_migrations;"
docker exec -u postgres workflow-universidad psql -d workflow -c "SHOW listen_addresses;"
docker inspect --format '{{json .Mounts}}' workflow-universidad
```

Se esperan ocho migraciones, `127.0.0.1` y una lista de montajes vacía.
El puerto 5432 no se publica. PostgreSQL corre como `postgres`; Node como `node`.
El supervisor necesita root para preparar permisos y cambiar de usuario. `tini`
recoge procesos huérfanos. SIGTERM/SIGINT detienen primero Node y luego PostgreSQL.
Si falla una migración no arranca Node; si muere un servicio crítico, el contenedor
termina con error. Docker puede reiniciarlo si se añade `--restart unless-stopped`.

## Demostración para el profesor

1. Construir la imagen y ejecutar el único `docker run` anterior.
2. Mostrar `docker ps --filter name=workflow-universidad` y el estado `healthy`.
3. Mostrar los montajes vacíos y las migraciones con los comandos anteriores.
4. Entrar con el administrador. Crear un departamento, usuarios, una tarea y
   adjuntar una evidencia usando los roles correspondientes.
5. Detener e iniciar **el mismo contenedor**, volver a entrar y comprobar los datos.
6. Probar sin Internet. Fuentes e iconos también se sirven desde el contenedor.
   Para una prueba automatizada estricta puede arrancarse otro contenedor con
   `--network none` y consultar HTTP desde dentro mediante `docker exec`.

No hay implementación de WebSockets en el proyecto actual: las acciones y cargas
de SvelteKit resuelven las operaciones del backend.

### Prueba funcional automatizada sin red

Usar un nombre nuevo: esta prueba crea usuarios, un proyecto, una tarea y un adjunto
de prueba. No ejecutarla sobre datos reales. El script está incluido en la imagen,
no requiere Node.js en el anfitrión ni descarga dependencias.

```bash
docker run -d --network none --name workflow-universidad-prueba workflow:universidad
docker exec workflow-universidad-prueba node docker/universidad/healthcheck.mjs
docker exec workflow-universidad-prueba node docker/universidad/verify.mjs
docker stop -t 45 workflow-universidad-prueba
docker start workflow-universidad-prueba
docker exec workflow-universidad-prueba node docker/universidad/healthcheck.mjs
docker exec workflow-universidad-prueba node docker/universidad/verify.mjs check
```

Esperar a que el healthcheck pase antes de ejecutar la siguiente prueba; durante
los primeros segundos puede fallar mientras se inicializa PostgreSQL.
La prueba cubre inicio de sesión, permisos, altas administrativas, asociación de
proyecto a tarea, checklist, revisión, carga/descarga de un adjunto y fuentes locales.
El modo `check` comprueba datos, adjuntos y el hash de contraseña tras el reinicio.
Deja datos de prueba y un archivo interno de comprobación con credenciales de demo.
Se puede detener y eliminar exclusivamente este contenedor cuando ya no se necesite.

Para entregar la imagen sin pedir al profesor que la construya:

```bash
docker save -o workflow-universidad.tar workflow:universidad
docker load -i workflow-universidad.tar
```

El primer comando se ejecuta en el equipo que construyó la imagen; el segundo en
el equipo receptor. Luego basta el `docker run`. Construir para la arquitectura
del equipo receptor; la validación local puede no cubrir otras arquitecturas.

## Problemas comunes

- **Docker no conecta:** iniciar Docker Desktop y esperar que `docker version`
  muestre Client y Server.
- **Nombre ocupado:** usar `docker start workflow-universidad` si ya existe.
  No borrarlo para resolver un problema sin respaldar sus datos.
- **Puerto ocupado:** elegir otro puerto y ajustar `ORIGIN` como se indica arriba.
- **Login o formularios rechazados:** comprobar que se usa el hostname y puerto
  de `ORIGIN`, que la inicialización terminó y que las credenciales corresponden
  al primer arranque. No usar el alias `admin`, reservado al desarrollo original.
- **Contenedor detenido/unhealthy:** consultar `docker logs` y `docker inspect`.
  Un fallo de migración se trata como error; no se elimina ni reinicializa la base.
- **Falló la descarga de fuentes o paquetes:** la construcción necesita Internet;
  corregir la conexión y repetir el build. No hay descargas de respaldo al arrancar.

## Diferencias frente a producción

Esta imagen está destinada a una demostración local. La arquitectura original
separa PostgreSQL y la aplicación mediante Compose y mantiene un volumen de datos.
Aquí los procesos comparten contenedor, los datos pertenecen a ese contenedor y
las cookies permiten HTTP local de forma explícita. Las dependencias JS usan el
lockfile; las imágenes base y paquetes del sistema reciben actualizaciones y no
se promete una reconstrucción idéntica byte a byte.

La instalación de PostgreSQL usa su [repositorio oficial para Debian](https://www.postgresql.org/download/linux/debian/).
El contexto usa un [archivo de exclusión específico del Dockerfile](https://docs.docker.com/build/concepts/context/)
con lista de archivos permitidos para no incluir `.env`, volcados de datos ni adjuntos del anfitrión.
