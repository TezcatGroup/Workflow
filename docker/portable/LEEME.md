# Workflow para el profesor

Requisitos: Docker funcionando con contenedores Linux y Docker Compose v2.
La arquitectura de la imagen debe coincidir con la máquina receptora.
No necesitas código fuente, Node, Python, PostgreSQL ni un archivo .env.

Copia esta carpeta a un disco local. Debe contener `compose.yaml` y
`workflow-2026.11.12.tar`. Desde esa carpeta ejecuta este bloque completo,
igual en PowerShell, Linux o macOS:

```text
docker load -i workflow-2026.11.12.tar
docker compose -p workflow-unico up -d --no-build --pull never --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

Abre http://localhost:3000. Usuario de la aplicación y PostgreSQL:
**admin@utslp.com**, contraseña **Pass123456**; base de datos `workflow`.
Son credenciales públicas de demostración. PostgreSQL no publica su puerto.
Desde otra máquina usa http://IP_DEL_EQUIPO:3000 si el firewall permite el acceso.

Se crea un solo contenedor. Compose crea o reutiliza el volumen `workflow_data`
para la base, adjuntos y credenciales. No hay descargas, compilación ni montajes
de carpetas durante el arranque. No se necesita conservar el TAR para ejecutar
la imagen ya cargada; conserva compose.yaml para administrar la instalación.

Si un comando falla, resuelve ese error antes de ejecutar el siguiente. Si falta
la imagen, comprueba que docker load terminó y repite `docker image inspect
workflow:2026.11.12`. Si el puerto 3000 está ocupado, no detengas servicios ajenos.

## Instalaciones existentes

El bloque conserva el contenedor existente: no lo actualiza ni restablece sus
credenciales. No puede usarse al mismo tiempo que otra instancia sobre el mismo
volumen. Los contenedores antiguos sin volumen requieren transferir sus datos
antes de recrearlos; este paquete no hace esa migración automáticamente.

Para detener y volver a iniciar sin borrar datos:

```text
docker compose -p workflow-unico stop
docker compose -p workflow-unico start
docker compose -p workflow-unico logs app
```

No elimines `workflow_data` ni uses opciones de eliminación de volúmenes.
El TAR contiene la aplicación, **no contiene los datos del volumen**.
Transferir una instalación con datos requiere además un respaldo/restauración.
No copies los archivos de PostgreSQL mientras esté activo.

## Sin Compose

Después de cargar la imagen, esta alternativa usa solo Docker. No ejecutes
ambas alternativas simultáneamente ni las uses para sustituir una instalación
antigua sin revisar sus datos:

```text
docker volume create workflow_data
docker run -d --name workflow --restart unless-stopped --stop-timeout 45 --mount type=volume,source=workflow_data,target=/var/lib/workflow -p 3000:3000 workflow:2026.11.12
docker exec workflow node docker/universidad/access.mjs
```

En siguientes ocasiones usa `docker start workflow`; no repitas docker run
con ese nombre. No se necesita el repositorio para estos comandos.
