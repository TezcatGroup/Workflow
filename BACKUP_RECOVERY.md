# Respaldos y recuperación de Workflow — fase 5

## Alcance

El script `docker/universidad/backup.py`, incluido en la imagen, crea un respaldo
físico completo con PostgreSQL **detenido limpiamente**. Guarda base, usuarios y
hashes, sesiones, migraciones, adjuntos y configuración persistente del volumen.
No copia una base activa. También detiene las escrituras del scheduler de
notificaciones al detener toda la aplicación.

Es un respaldo para recuperar con **la misma imagen y arquitectura Linux**,
PostgreSQL 16 y configuración original; no es una migración entre arquitecturas
ni versiones mayores. Conserva la imagen que estaba en uso, además del respaldo.
El procedimiento sigue la [documentación de PostgreSQL para copias físicas](https://www.postgresql.org/docs/16/backup-file.html).

El servidor sigue usando un contenedor de aplicación. El mantenimiento usa un
contenedor temporal con la misma imagen y sin red, mientras la aplicación está
detenida; termina al completar la operación. No se agrega un servicio permanente.

## Antes de empezar

Estos comandos suponen una instalación de fase 5 en `workflow-unico-app-1`, con
el volumen `workflow_data`. Compruébalo con:

```text
docker inspect workflow-unico-app-1 --format '{{json .Mounts}}'
docker inspect workflow-unico-app-1 --format '{{.Image}}'
```

Guarda el ID mostrado y crea una etiqueta para esa imagen exacta (sustituye
`ID_DE_IMAGEN` por el resultado, conservando el prefijo sha256):

```text
docker tag ID_DE_IMAGEN workflow:backup-source
```

Usa esa misma etiqueta para respaldar y restaurar. No la reasignes mientras
conserves respaldos que dependan de ella. Las imágenes entregadas en la fase 4
anterior no contienen este script: esta función requiere la imagen de fase 5.
Si tienes un contenedor anterior sin volumen, no lo recrees para seguir esta guía;
primero debe planificarse una transferencia de datos independiente.

## Crear el respaldo

Abre una terminal en una carpeta **local de respaldos**, fuera del repositorio.
El Docker CLI debe apuntar al motor local, no a un contexto remoto. Se monta
únicamente esa carpeta para escribir el archivo; nunca el código ni SMB.
El mismo bloque funciona en PowerShell y terminales de Linux/macOS con Docker.
Elige un nombre nuevo para cada respaldo; el script rechaza sobrescribirlo.

```text
docker stop -t 45 workflow-unico-app-1
docker run --rm --network none --mount type=volume,source=workflow_data,target=/var/lib/workflow --mount type=bind,source=.,target=/backups --entrypoint python3 workflow:backup-source /app/docker/universidad/backup.py backup /backups/workflow-20261115-01.tar.gz
docker start workflow-unico-app-1
```

Comprueba el resultado de cada comando. Si el respaldo falla, no declares éxito;
el original sigue intacto y puedes iniciarlo para recuperar el servicio. El
script rechaza el volumen si la aplicación aún lo usa o PostgreSQL no figura
como `shut down`. Un apagado forzado requiere arrancar y detener limpiamente
antes de repetir. No permitas que otros procesos modifiquen el volumen durante
el mantenimiento. Los enlaces simbólicos y tablespaces externos se rechazan.

El TAR incluye un manifiesto con SHA-256 por archivo. Una interrupción puede
producir un archivo incompleto: no lo uses ni lo sobrescribas; genera otro nombre.
La restauración valida gzip, rutas, tipos, tamaños y hashes antes de escribir.

Guarda también la imagen exacta, usando un nombre de archivo nuevo:

```text
docker save -o workflow-imagen-20261115-01.tar workflow:backup-source
```

La imagen sola no es un respaldo de datos. Copia los dos archivos a otro disco o
almacenamiento después de terminar. Los respaldos contienen información privada
y contraseñas de configuración: protégelos mediante permisos del anfitrión y
almacenamiento cifrado. El TAR no está cifrado ni firmado; los hashes detectan
corrupción, no autentican un archivo recibido. Solo restaura respaldos confiables.
No los subas a Git (los TAR están excluidos) ni publiques su contenido en logs.

## Restaurar sin sobrescribir la instalación actual

Desde la carpeta del respaldo, carga la imagen guardada si no está disponible:

```text
docker load -i workflow-imagen-20261115-01.tar
```

Usa un volumen nuevo, por ejemplo `workflow_recovered_20261115`. El script rechaza
un destino que ya contenga datos. No borra el original ni vacía volúmenes.

```text
docker volume create workflow_recovered_20261115
docker run --rm --network none --mount type=volume,source=workflow_recovered_20261115,target=/var/lib/workflow --mount type=bind,source=.,target=/backups,readonly --entrypoint python3 workflow:backup-source /app/docker/universidad/backup.py restore /backups/workflow-20261115-01.tar.gz
```

Si falla, no inicies la aplicación sobre ese volumen. En una extracción
interrumpida queda una marca que impide el arranque; conserva ese volumen para
revisión y repite la restauración en otro volumen nuevo. La herramienta no hace
limpieza destructiva automática.

Para revisar la copia restaurada sin tocar el servicio original, publica otro
puerto y permite conexiones solo desde tu computadora:

```text
docker run -d --name workflow-recovered-20261115 --stop-timeout 45 --mount type=volume,source=workflow_recovered_20261115,target=/var/lib/workflow -p 127.0.0.1:3002:3000 workflow:backup-source
docker exec workflow-recovered-20261115 node docker/universidad/healthcheck.mjs
```

Espera que el healthcheck pase y abre **http://localhost:3002**. Usa la contraseña
vigente al momento del respaldo (no necesariamente la contraseña inicial).
Verifica usuarios, proyectos, tareas, mensajes y descarga de adjuntos conocidos.
No ejecutes verify.mjs sobre datos reales: ese script crea datos de prueba.
El script access.mjs muestra la contraseña inicial y anuncia el puerto estándar;
en esta comprobación debes usar el puerto 3002.

La copia restaurada aplica las migraciones pendientes de su imagen al arrancar:
por eso se recomienda primero la misma imagen. Una versión posterior puede
requerir una actualización de esquema; volver a una imagen antigua no es un
rollback garantizado. Solo sustituye la instalación original tras comprobar la
recuperación. La decisión de sustitución y retirada de los datos originales es
manual; estos comandos no la realizan.

## Qué se conserva

- Todo el clúster PostgreSQL 16, incluidos roles, hashes, sesiones e historial.
- Todos los adjuntos del volumen y sus metadatos en la base.
- db-password, initial-admin.json y demás archivos persistentes del volumen.
- Se excluye el archivo de bloqueo de ejecución; se crea otro al arrancar.

No se incluyen configuración del anfitrión, reglas de firewall, proxy externo
ni variables de Docker que no estén guardadas en el volumen. Conserva también
el archivo Compose y tus opciones de ejecución si las personalizaste.

Resultados de la prueba real: [FASE5_VALIDACION.md](docker/universidad/FASE5_VALIDACION.md).
