# Cierre funcional — 17 de noviembre de 2026

## Cambios

- Progreso: regla compartida de 1,000 XP por nivel; dashboard y perfil usan la misma escala y el avance dentro del nivel actual. No se modifican los movimientos de XP existentes.
- Proyectos (`/proyectos`): administradores gestionan todos los departamentos; encargados, solo el suyo. Alta, edición de nombre/descripción, archivo y reactivación con auditoría. Los miembros no tienen acceso a la gestión. Archivar conserva las tareas y evita seleccionar el proyecto en nuevas tareas. No se permite trasladar un proyecto entre departamentos.
- Tareas: el encargado del departamento puede editar título, descripción, prioridad y fecha en estado Asignada o En proceso. El motivo es obligatorio, se conserva el antes/después en el historial y se rechazan formularios con una versión antigua. No se permite modificar tareas en revisión o terminadas.
- Auditoría: búsqueda en todo el historial, filtros por acción y fechas UTC, páginas de 25 eventos y presentación legible de cambios. Los filtros se mantienen al cambiar de página.
- Recuperación de acceso: desde Usuarios, un administrador verifica su contraseña y restablece la de un miembro o encargado activo. Se revocan todas las sesiones y se registra el evento sin contraseñas. Debe verificar la identidad de la persona y entregar la contraseña por un medio privado; la persona puede cambiarla desde Perfil. El acceso de Google se conserva. No se incluye recuperación por correo ni restablecimiento de cuentas ADMIN; estas requieren al responsable de la instalación. El login explica cómo solicitar ayuda.
- Equipo: muestra las fotos reales; el endpoint exige un encargado del mismo departamento y una cuenta objetivo activa.

## Validación

Imagen `workflow:2026.11.17-r5`, contenedor aislado `workflow-completion-test-20261117`, puerto 13029 y volumen exclusivo `workflow_completion_test_20261117`.

- `pnpm check`: 0 errores y 0 advertencias.
- Construcción Docker de producción: aprobada.
- `scripts/verify-completion.mjs`: 6 grupos aprobados; permisos, aislamiento, archivo/reactivación de proyectos, edición y conflictos, niveles, historial de más de 100 eventos, fechas inválidas, fotos y recuperación con revocación de sesiones.
- `scripts/verify-functional.mjs`: 10 grupos de regresión aprobados (roles, tareas, mensajes, archivos, reasignación, notificaciones, recompensas y canjes).
- `scripts/verify-profile.mjs`: 4 grupos aprobados (restricciones de ADMIN, fotos, cambio de contraseña y limpieza de fotos al eliminar cuentas).
- Playwright Chromium: 8 vistas entre ADMIN/ENCARGADO/MIEMBRO a 1440 y 390 píxeles; edición de tarea desde el formulario, búsqueda de auditoría, carga de foto y formularios de recuperación. Sin errores de JavaScript ni desbordamiento horizontal de página.

Las capturas locales quedaron en `Downloads/workflow-completion-20261117`. No se incluyen credenciales OAuth, sesiones ni datos de prueba en Git.

## Repetir pruebas funcionales

Usar exclusivamente una base de prueba. El script conserva las cuentas sintéticas para inspección. Requiere `WORKFLOW_TEST_ONLY=1`, `DATABASE_URL`, `TEST_BASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

```text
node scripts/verify-completion.mjs
```

La aplicación no necesita migraciones nuevas. La publicación en internet y la prueba completa contra Google real son trabajos separados de esta validación.
