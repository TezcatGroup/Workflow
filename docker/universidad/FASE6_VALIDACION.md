# Fase 6 — pruebas integrales

Pruebas ejecutadas el 15 de noviembre de 2026 (hora de México) sobre el commit
f556c31 de Docker, que incluye main 297aa3f. Se ejecutó git fetch origin antes
de probar: Docker coincidía con origin/Docker y no faltaban commits de main.
Este informe registra resultados reales; no modifica la lógica de negocio.

## Entorno y artefactos

- Windows, Docker Desktop con motor 29.8.2, contenedores Linux amd64.
- Imagen workflow:phase6, ID
  sha256:0d251f8dfa2e5161ca8f0dbdaa595986309449806f213e6d87cb2e4bcab20b15.
- Tamaño de imagen: 879162980 bytes (aproximadamente 838 MiB). TAR exportado:
  216326656 bytes (206 MiB). Memoria observada en reposo: 281.8 MiB;
  es una muestra, no una prueba de carga ni un requisito mínimo garantizado.
- Un único contenedor de aplicación ejecuta Node y PostgreSQL. Los auxiliares
  de respaldo/restauración son temporales y se eliminaron con --rm.
- Datos sintéticos en workflow_phase6_20261115; recuperación en el volumen
  independiente workflow_phase6_recovered_20261115. No se eliminaron volúmenes.
- Evidencias locales: C:\Users\black\Downloads\workflow-phase6-20261115
  (build.log, logs de suites, browser.py, browser.json, capturas, recovery.log,
  containers.json, TAR, respaldo y SHA256SUMS.txt). No se suben archivos binarios
  ni datos de prueba al repositorio.

## Pruebas ejecutadas

| Prueba | Resultado |
| --- | --- |
| pnpm check | 0 errores, 0 advertencias |
| Construcción con Dockerfile y lockfile | Correcta |
| Arranque sobre volumen vacío | Migraciones y administrador creados automáticamente |
| Credenciales de aplicación y base de datos | admin@utslp.com / Pass123456, verificadas por HTTP y conexión SQL |
| Suite Sprint 1 | Aprobada |
| Suite Sprint 4 | TC-09 a TC-13 aprobados; TC-14 falla; TC-15 a TC-18 no se ejecutaron |
| Suite muro | Aprobada: aislamiento, concurrencia, permisos y acreditación única |
| Suite gamificación | Aprobada: TW-16 a TW-22 |
| verify.mjs | Aprobada: login, permisos, departamentos, usuarios, tareas, criterios, revisión, adjuntos y fuentes locales |
| Navegador Chromium headless | Login real de ADMIN y MIEMBRO; seis páginas HTTP 200 sin excepciones JavaScript |
| Páginas de ADMIN | /admin, /admin/usuarios, /admin/recompensas |
| Páginas de MIEMBRO | /perfil, /tienda, /notificaciones |
| Capturas | Escritorio 1440 × 900 y móvil 390 × 844; no constituyen auditoría completa de accesibilidad |
| Persistencia | Se detuvo y eliminó únicamente workflow-phase6; un nuevo contenedor con el mismo volumen pasó verify.mjs check |
| Independencia del código fuente | Contenedor recreado con --network none y solo el volumen de datos; sin bind mounts del repositorio; verificación aprobada |
| Exportación/importación | docker save y docker load correctos; mismo ID de imagen antes y después |
| Respaldo detenido | Archivo phase6.tar.gz de 6999373 bytes |
| Restauración | Volumen nuevo, arranque sin red y verify.mjs check aprobados |
| Caída de Node | SIGKILL al proceso Node; supervisor detiene PostgreSQL y sale con código 1; reinicio y verificación aprobados |
| Caída de PostgreSQL | SIGKILL al postmaster; contenedor termina con código 1; reinicio y verificación aprobados |
| Apagado normal | Contenedores finales detenidos con código 0 |
| Acceso desde otra máquina | curl desde VM Debian 192.168.100.26 hacia Windows 192.168.100.15:13026/login: HTTP 200 |

verify.mjs check comprobó el hash de contraseña del administrador, cantidad de
usuarios, ocho migraciones, tarea terminada y contenido del adjunto después de
recrear, restaurar y reiniciar tras cada caída. No equivale a comparar todas las
filas de todas las tablas. Los contenedores de esta fase quedaron detenidos y los
dos volúmenes se conservaron. El acceso desde la VM fue una petición HTTP; el
login interactivo completo se probó desde el navegador local.

## Error detectado y alcance funcional

Sprint 4 espera HTTP 200 al enviar una tarea a revisión con criterios pendientes.
La aplicación devuelve 400 conforme a su regla actual. La suite se detiene en
TC-14 (5 de 10 casos aprobados). No se cambió la aplicación para permitir saltarse
la lista de criterios ni se ocultó el fallo. Queda pendiente actualizar esa suite
a las reglas actuales y ejecutar sus casos restantes. verify.mjs sí comprueba el
rechazo con criterios pendientes, su cumplimiento y la posterior aprobación.

La prueba crea un proyecto directamente en PostgreSQL y lo vincula a una tarea
mediante la aplicación. No hay rutas de gestión de proyectos en la versión
actual: creación y edición por interfaz no están verificadas ni implementadas
como parte de esta fase Docker.

No se encontró un servicio WebSocket que probar. La aplicación utiliza consultas
HTTP periódicas: detalle de tareas cada 12 segundos y notificaciones cada 25
segundos. Se comprobaron las páginas; no se midió la entrega periódica ni el
planificador durante un periodo prolongado.

## Límites y pruebas pendientes

- La imagen se importó en el mismo motor Docker, con capas existentes. El intento
  de quitar su etiqueta fue rechazado por Docker porque un contenedor detenido
  la referenciaba; no se forzó su eliminación. No se atribuye a esta prueba una
  importación en un motor vacío ni en otro sistema operativo.
- El contenedor no tenía acceso montado al repositorio ni acceso de red durante
  la prueba de independencia. No se renombró ni retiró físicamente la carpeta de
  trabajo del usuario. Las herramientas de prueba copiadas al primer contenedor
  no existen en el contenedor recreado: este ejecutó el verificador de la imagen.
- SMB fue probado en la fase 4; no se repitió la construcción sobre CIFS para
  esta imagen. Véase SMB_VALIDACION_VM.md para el entorno y sus límites.
- No se probaron macOS, ARM64, otro motor limpio, carga sostenida, disco lleno,
  corte eléctrico, recuperación de un volumen dañado ni pérdida del equipo.
- No se garantiza funcionamiento en cualquier máquina: necesita Docker con
  contenedores Linux y recursos suficientes. El respaldo físico probado requiere
  la misma arquitectura y PostgreSQL 16.
- El paquete de entrega workflow:2026.11.12 de fase 4 no fue reemplazado. Esta
  imagen de pruebas contiene main integrado y backup.py; actualizar y documentar
  la entrega definitiva corresponde a la fase 7, previa autorización.

La fase 6 entrega este informe con resultados y pendientes; no afirma que todas
las suites estén en verde ni que se hayan cubierto todas las plataformas.
