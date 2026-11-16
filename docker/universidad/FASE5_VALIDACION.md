# Fase 5 — respaldos y recuperación

Pruebas ejecutadas el 15 de noviembre de 2026 en Docker Desktop, Linux amd64.

## Sincronización del repositorio

Al comenzar se revisó el estado local sin hacer fetch; después de la observación
del usuario se ejecutó git fetch origin. Docker coincidía con origin/Docker,
pero main tenía ocho commits adicionales. Con autorización explícita se integró
origin/main (297aa3f) en Docker mediante bc5bf46, sin conflictos. Se reconstruyó y
repitieron las pruebas sobre esa integración, no solo sobre el código anterior.
No se modificaron los archivos locales ajenos a esta tarea.

## Cambios

- backup.py incluido en la imagen: respaldo físico completo con PostgreSQL
  detenido limpiamente, bloqueo exclusivo, archivo nuevo y manifiesto SHA-256.
- Restauración a volumen vacío exclusivamente, validación gzip y de todos los
  archivos antes de escribir, rechazo de enlaces/rutas inseguras y remapeo de
  propietarios postgres/node a los usuarios de la imagen.
- Marca de restauración incompleta: el supervisor no inicia ni inicializa la base
  si una extracción quedó interrumpida.
- BACKUP_RECOVERY.md: procedimiento de respaldo, copia de la imagen, restauración
  aislada y comprobación manual. README y guía Docker enlazan el procedimiento.

## Resultados sobre main integrado

Imagen de prueba: workflow:phase5-main. Todos los datos fueron sintéticos.
Se usaron volúmenes nuevos con prefijo workflow_phase5_main_20261115 (nombres
concretos workflow_phase5_main_source_20261115 y workflow_phase5_main_restored_20261115).

| Comprobación | Resultado |
| --- | --- |
| pnpm check | 0 errores y 0 advertencias |
| Construcción Docker con lockfile | Correcta |
| verify-gamificacion.ts (TW-16 a TW-22) | Aprobada |
| verify.mjs (login, permisos, proyecto, tarea, revisión, adjuntos, fuentes) | Aprobada |
| Respaldo con aplicación activa | Rechazado por bloqueo, código 1 |
| Respaldo tras apagado limpio | Correcto; archivo de 6820499 bytes |
| Repetir con mismo archivo | Rechazado; SHA-256 del archivo original intacto |
| Restaurar sobre volumen con datos | Rechazado sin sobrescribir |
| Restaurar en volumen nuevo | Correcto |
| Arranque sin red de la copia restaurada | Correcto |
| verify.mjs check sobre copia | Usuarios, tarea, contenido del adjunto, hash, credenciales y migraciones conservados |
| Notificaciones, API, perfil y tienda con rol MIEMBRO | HTTP 200 |
| Catálogo de recompensas con rol ADMIN | HTTP 200 |
| Acceso ADMIN a notificaciones | Redirección 303, conforme a las reglas de main |
| Archivo gzip truncado | Rechazado antes de escribir datos |
| db-password alterado sin actualizar hash | Rechazado por integridad |
| Ruta ../escape y enlace simbólico | Rechazados |
| Volumen tras archivos inválidos | Solo archivo de bloqueo, sin datos extraídos |
| Marca de restauración incompleta | Supervisor rechaza arranque y no crea PostgreSQL |
| git diff --check | Correcto |

La suite de gamificación se empaquetó temporalmente con esbuild y se copió solo
al contenedor de prueba; no se agregaron herramientas de desarrollo a la imagen.
Una comprobación inicial de notificaciones esperaba incorrectamente 200 para
ADMIN. Se revisó la regla de main, que redirige a /admin, y se verificó la página
con MIEMBRO, sin cambiar la lógica de negocio.

Respaldo de prueba local:
C:\Users\black\Downloads\workflow-backups-test-20261115\workflow-main-20261115.tar.gz

No se respaldó ni restauró producción. Los contenedores de aplicación de prueba
quedaron detenidos y sus volúmenes se conservaron. Los auxiliares de mantenimiento
se eliminaron con --rm al terminar; ningún comando eliminó volúmenes.

## Límites

- Recuperación física con la misma imagen, Linux amd64 y PostgreSQL 16. No se
  valida traslado ARM64, cambio de versión mayor ni migración desde instalaciones
  antiguas sin volumen.
- Requiere detener la aplicación durante el respaldo. No es respaldo en caliente,
  replicación, PITR ni un volcado lógico pg_dump.
- SHA-256 y gzip detectan corrupción; no aportan cifrado ni autenticidad frente a
  un archivo modificado intencionalmente. Solo restaurar archivos confiables.
- Los TAR de fase 4 ya entregados no se actualizaron silenciosamente; se necesita
  una imagen nueva de fase 5 para disponer de backup.py.
- No se repitió esta fase en la VM Proxmox. La prueba SMB anterior permanece
  documentada, pero no se atribuye a la implementación nueva de respaldos.
- La batería integral completa y la entrega final siguen en fases 6 y 7.
