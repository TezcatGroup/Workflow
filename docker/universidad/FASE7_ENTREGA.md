# Fase 7 — entrega y prueba SMB entre VM y Windows

Ejecutada el 16 de noviembre de 2026, hora de México. Código de aplicación:
commit c56e716 de Docker (incluye main 297aa3f). Los cambios de esta fase son de
documentación; no cambian la lógica de negocio.

## Prueba solicitada: VM → SMB → esta PC → Docker

1. Se transfirió a la VM Debian 192.168.100.26 un git archive del commit indicado.
   Solo esa copia se compartió, no archivos personales ni bases existentes.
2. Samba temporal, autenticado, recurso de solo lectura, puerto 445 en la IP de
   la VM y acceso limitado a las IP de esta PC. Los servicios anteriores de la VM
   no se detuvieron ni modificaron. El servidor exige SMB3 como mínimo; Windows
   no permitió consultar el dialecto negociado sin elevar permisos, por lo que
   no se afirma una subversión específica para esta conexión.
3. Windows conectó el recurso mediante net use y leyó el Dockerfile desde
   `\\192.168.100.26\workflow`. PowerShell entró directamente en esa ruta UNC.
4. Se ejecutó docker build con contexto `.` desde UNC: construcción correcta,
   instalación de dependencias y compilación dentro de Docker. No se instaló
   node_modules ni se escribieron archivos en la carpeta SMB.
5. Desde la misma UNC se ejecutó el bloque de inicio Compose del README. Solo se
   cambiaron el nombre de proyecto a workflow-phase7-smb y el nombre del volumen
   a workflow_phase7_smb_20261116 para aislar la prueba. Puerto normal: 3000.
6. access.mjs y verify.mjs pasaron: login, permisos, usuarios, departamentos,
   tarea vinculada a proyecto de prueba, revisión, adjuntos y fuentes locales.
7. Se detuvo el servidor Samba y se desconectó el recurso en Windows. Se reinició
   el contenedor y verify.mjs check confirmó datos, contraseña, migraciones y
   contenido del adjunto. Su único montaje es el volumen local de datos.

Esto sí comprueba el recorrido entre dos máquinas solicitado por el usuario.
La prueba anterior de fase 4 usaba cliente y servidor SMB dentro de la VM.
No demuestra la causa del fallo original del profesor ni compatibilidad con
cualquier servidor SMB, arquitectura o configuración de Docker.

## Entrega

- Imagen: workflow:2026.11.16, Linux amd64.
- ID: sha256:4839aa0510786491668de801336d2778c4cf241822e73a0d7c1d3ec9f8afd991.
- Construida desde la copia SMB del código probado, incluye backup.py.
- Carpeta local: C:\Users\black\Downloads\workflow-2026.11.16-linux-amd64.
- Contenido: imagen TAR, compose.yaml, LEEME.md, guía Docker, guía de respaldos,
  informes de validación y SHA256SUMS.txt. No incluye datos del volumen, código
  fuente completo, claves de SSH ni credenciales del recurso SMB de prueba.
- La entrega anterior 2026.11.12 se conserva sin sobrescribirla.
- No se publicó ninguna imagen en un registro ni se creó PR.
- TAR de 216327168 bytes, SHA-256:
  47c1837bd0c5df9f593ac14e1b7048867c10a6afd1b74f8e0af13a07923fd1c4.
  Se importó con docker load en esta PC y Compose validó el archivo de entrega.
  No se atribuye esa importación a un motor limpio o a otra arquitectura.

El README y LEEME contienen el bloque de comandos de inicio y las credenciales
solicitadas: admin@utslp.com / Pass123456 para aplicación y PostgreSQL. Docker
debe estar instalado y funcionando. El volumen se crea automáticamente y solo
se ejecuta un contenedor permanente de Workflow.

## Estado para revisión del usuario

Por petición expresa, workflow-phase7-smb-app-1 queda **encendido** en
http://localhost:3000 para probarlo manualmente. Contiene datos sintéticos de las
pruebas. Su volumen se conserva. No se retirará ni detendrá durante esa revisión.
El servidor Samba temporal quedó detenido y Windows desconectó el recurso.

La validación posterior solicitada por el usuario actualizó Sprint 4 (10/10) y
amplió las pruebas a los tres roles. Encontró dos fallos de concurrencia en
canjes; consulta [FUNCTIONAL_VALIDATION.md](../../FUNCTIONAL_VALIDATION.md).
La entrega no se declara funcionalmente aprobada sin incidencias. Gestión de
proyectos por interfaz no implementada, macOS/ARM64 y carga siguen pendientes.
La revisión manual del usuario no se declara aprobada antes de sus resultados.
