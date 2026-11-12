# Prueba real de SMB en la VM de Proxmox

Ejecutada el 12 de noviembre de 2026 sobre el commit f19f3aa de la rama Docker.

## Entorno y aislamiento

- Host Proxmox: proxmox-tezcat-01. VM 100: debian-server, Linux amd64,
  kernel 6.12.105+deb13-amd64, Docker 26.1.5+dfsg1.
- No se instalaron paquetes en el hipervisor ni en el sistema de la VM.
- Samba se construyó y ejecutó en un contenedor auxiliar temporal, publicado
  solamente en 127.0.0.1:1445 de la VM. No se expuso un recurso anónimo a la LAN.
- Se transfirió un git archive del commit indicado a /tmp/workflow-smb-20261112.
  El recurso comparte solo esa copia de prueba, con lectura únicamente.
- El cliente CIFS y el servidor Samba están en la misma VM (tráfico loopback).
  Es una prueba real del protocolo y del sistema de archivos SMB, no una prueba
  de latencia o interrupciones SMB entre dos equipos físicos.
- Workflow sigue siendo un único contenedor; el contenedor Samba es exclusivamente
  infraestructura de esta prueba, no una dependencia del despliegue de Workflow.

## Montaje comprobado

```text
Origen: //127.0.0.1/workflow
Destino: /tmp/workflow-smb-20261112/mounted
Tipo: cifs
Protocolo: SMB 3.1.1
Opciones relevantes: ro,nosuid,nodev,noexec,vers=3.1.1,cache=strict
```

Se utilizó el módulo CIFS del kernel y mount -i, sin instalar mount.cifs.
No se hicieron chmod/chown sobre el recurso montado.

## Resultados

| Prueba | Resultado |
| --- | --- |
| docker build con contexto en el montaje CIFS | Correcto, código 0 |
| Compilación Svelte y dependencias dentro de Docker | Correcta |
| Comparación SHA-256 de todos los archivos fuente antes/después | Idénticos; no se modificó la carpeta compartida |
| Desmontar CIFS y detener Samba antes de iniciar Workflow | Correcto |
| Arrancar Workflow con volumen Docker local, sin repositorio | Correcto |
| Healthcheck PostgreSQL/HTTP | Correcto |
| verify.mjs | Login, permisos, departamentos, usuarios, proyecto, tarea, revisión, adjuntos y fuentes: aprobado |
| GET /login desde Windows hacia la VM por LAN | HTTP 200 |
| Login desde Windows hacia la VM por LAN | HTTP 303 y cookie de sesión |
| Desconectar la red del contenedor y reiniciar | Correcto |
| verify.mjs check tras reinicio sin red ni SMB | Datos, hash, credenciales, ocho migraciones y adjuntos conservados |
| Montajes del contenedor de aplicación | Solo un volumen local; ningún bind mount |
| Servicios preexistentes de la VM | Continuaron ejecutándose; no se reiniciaron ni modificaron |

El contexto de construcción fue exactamente:

```text
docker build --progress=plain -t workflow:smb-20261112 /tmp/workflow-smb-20261112/mounted
```

Imagen obtenida:

```text
sha256:3b0fedcb4204d0cb3711451804302bcc35afbdec44c9e706d33d9002ea0f293a
```

El acceso LAN utilizó temporalmente el puerto 13026 de la VM. No se alteraron
firewalls, puertos de las aplicaciones existentes ni sus datos. La aplicación
de prueba se limitó a 768 MiB y un CPU.

## Estado final y evidencias

- CIFS desmontado.
- workflow-smb-server-20261112 y workflow-smb-app-20261112 detenidos.
- Volumen de prueba workflow_smb_validation_20261112 conservado; no se eliminaron
  volúmenes ni datos existentes. Imágenes y archivos temporales de prueba se
  conservaron para revisión.
- Logs, montaje JSON y hashes: /tmp/workflow-smb-20261112 en la VM.
- Copia local: C:\Users\black\Downloads\workflow-smb-evidence-20261112.tar.gz.
- SHA-256 del archivo de evidencias:
  5a0c538222030ca796a12e8837630a58338b38bfeb74a089ee0c69e32abdad02.

## Conclusión y límites

La versión actual puede construirse leyendo un recurso SMB 3.1.1 de solo lectura
con noexec y ejecutarse después sin acceso al recurso. No hizo falta modificar
código para superar esta prueba.

Esto no identifica la causa original del fallo del profesor: aún faltan sus logs,
versión de Docker, permisos y configuración concreta de SMB. No se han probado
otras versiones de SMB, ARM64, cortes de conexión o montajes de PostgreSQL sobre
SMB. La base y adjuntos deben permanecer en el volumen administrado local.

La exportación/importación del TAR no se repitió en esta VM: aquí se construyó
la imagen desde el contexto CIFS. El informe anterior conserva ese límite.
