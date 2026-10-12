# Sprint 4 · Contrato backend → frontend (tareas obligatorias)

Este documento le dice a quien hace el frontend qué entrega el backend en cada ruta, qué campos
espera cada formulario y qué errores pueden aparecer. La lógica y los permisos viven en el servidor
(`src/lib/server/tareas.ts`); **las vistas no deben repetir reglas**, solo mostrar lo que llega.

## Qué es de quién

| Backend (no tocar sin avisar) | Frontend (libre para rediseñar) |
|---|---|
| `src/lib/server/tareas.ts` | `src/routes/tareas/+page.svelte` |
| `src/routes/tareas/**/+page.server.ts` | `src/routes/tareas/nueva/+page.svelte` |
| `src/hooks.server.ts` | `src/routes/tareas/[id]/+page.svelte` |
| `src/routes/dashboard/+page.server.ts` | `src/lib/components/*` (encabezado, tarjetas) |

Las tres vistas `.svelte` actuales son **provisionales**: funcionan para probar el backend y se
pueden reemplazar completas. Mientras se mantengan los nombres de campo y las acciones de abajo,
el backend no necesita cambios.

## Rutas

| Ruta | Quién entra | Qué hace |
|---|---|---|
| `/tareas` | Cualquier usuario con sesión | Lista de tareas según el rol |
| `/tareas/nueva` | Solo `ENCARGADO` (otros: 403) | Formulario de creación |
| `/tareas/[id]` | Creador, responsable, revisor, encargado del departamento y `ADMIN` (otros: 403) | Detalle y cambio de estado |

Sin sesión, todas redirigen (303) a `/login`.

## `/tareas` (lista)

`data`:

- `user`: `{ id, nombre, rol, departamentoId }`
- `puedeCrear`: `boolean`. `true` si es `ENCARGADO` (mostrar el botón hacia `/tareas/nueva`).
- `tareas`: `[{ id, numero, titulo, estado, prioridad, dificultad, fechaLimite, responsableNombre }]`, ordenadas por fecha límite.

Qué ve cada rol: `MIEMBRO` sus tareas asignadas, `ENCARGADO` las de su departamento, `ADMIN` todas (solo lectura).
Cada tarea enlaza a `/tareas/<id>`. El código visible de una tarea es `CORE-<numero>`.

## `/tareas/nueva` (crear)

`data`:

- `user`
- `responsables`: `[{ id, nombre, rol }]` usuarios activos del departamento (opciones para el responsable)
- `revisores`: `[{ id, nombre, rol }]` encargados activos del departamento (opciones para el revisor)
- `proyectos`: `[{ id, nombre }]` proyectos activos del departamento
- `prioridades`: `BAJA | MEDIA | ALTA | URGENTE` (por defecto `prioridadPorDefecto` = `MEDIA`)
- `dificultades`: `FACIL | INTERMEDIA | DIFICIL | EXPERTO` (por defecto `dificultadPorDefecto` = `INTERMEDIA`)

Acción: `POST ?/crear` (`application/x-www-form-urlencoded`, funciona con `use:enhance`)

| Campo | Obligatorio | Regla |
|---|---|---|
| `titulo` | Sí | 1 a 200 caracteres |
| `responsableId` | Sí | Usuario activo del mismo departamento |
| `fechaLimite` | Sí | `YYYY-MM-DD` (se toma como fin de ese día) o `YYYY-MM-DDTHH:mm`. Debe ser futura |
| `descripcion` | No | Hasta 5000 caracteres |
| `revisorId` | No | Debe ser un `ENCARGADO` activo del departamento. Si se omite, revisa quien crea la tarea. No puede ser el responsable |
| `prioridad` | No | Una de `prioridades` |
| `dificultad` | No | Una de `dificultades` |
| `proyectoId` | No | Proyecto activo del mismo departamento |
| `criterios` | No | Campo **repetido**, uno por criterio (máx. 255 caracteres y 20 criterios). Los vacíos se ignoran |

Resultados:

- Éxito: `303` a `/tareas/<id>`.
- Error de validación: `fail(400, { error: string, valores })`. `error` es un mensaje listo para mostrar y
  `valores` trae lo que la persona escribió (`titulo`, `descripcion`, `responsableId`, `revisorId`,
  `fechaLimite`, `prioridad`, `dificultad`, `proyectoId`, `criterios[]`) para no vaciar el formulario.

El servidor fija por su cuenta el tipo (`OBLIGATORIA`), el estado inicial (`ASIGNADA`), el departamento, el
creador y la ausencia de XP/puntos. **No se envían desde el formulario.**

## `/tareas/[id]` (detalle)

`data`:

- `user`
- `tarea`: `{ id, numero, titulo, descripcion, tipo, estado, prioridad, dificultad, fechaLimite, creadoEn, actualizadoEn }` (fechas como `Date`)
- `creador`, `responsable`, `revisor`: `{ id, nombre } | null`
- `proyecto`: `{ id, nombre } | null`
- `criterios`: `[{ id, descripcion, completado }]` (solo lectura en este sprint; marcarlos es TW-07)
- `archivos`: `[{ id, nombre, mimeType, tamanoBytes }]` (vacío hasta TW-08)
- `eventos`: `[{ id, tipo, detalle, creadoEn, actorNombre }]`, el más reciente primero.
  `tipo` es `TAREA_CREADA` o `CAMBIO_ESTADO` (con `detalle: { de, a }`)
- `transicionesPermitidas`: `string[]` con los estados a los que **esta persona** puede mover la tarea.
  Vacío significa que no se muestra ningún botón.

Acción: `POST ?/cambiarEstado` con el campo `estado` (`ASIGNADA | EN_PROCESO | EN_REVISION | TERMINADA`).

- Éxito: `{ ok: 'Estado actualizado.' }` y los datos se recargan solos.
- Error: `fail(status, { error })`:
  - `400`: transición no permitida o estado inválido
  - `403`: sin permiso
  - `409`: la tarea cambió mientras se editaba (pedir recargar)

Errores de carga: `404` si la tarea no existe y `403` si no tiene acceso.

## Estados y quién puede cambiarlos

| De | A | Quién |
|---|---|---|
| `ASIGNADA` | `EN_PROCESO` | Responsable |
| `EN_PROCESO` | `EN_REVISION` | Responsable |
| `EN_REVISION` | `TERMINADA` | Revisor o encargado del departamento |
| `EN_REVISION` | `EN_PROCESO` | Revisor o encargado del departamento (devolver) |

`TERMINADA` es final. La revisión por encargado/revisor es **provisional** hasta TW-12 (Sprint 6).
Los textos de los botones los define la vista; `transicionesPermitidas` solo dice cuáles mostrar.

## Pendientes que son del frontend

- Agregar **Tareas** (`/tareas`) al menú de `EncabezadoApp.svelte` para `MIEMBRO` y `ENCARGADO`.
- En el dashboard, cada tarea trae ahora `tareaId`: úsalo para enlazar a `/tareas/<tareaId>`.
- Diseño final de las tres vistas, estados vacíos y mensajes.

## Probar en local

1. `docker compose up -d db`, `pnpm install`, `pnpm db:migrate`, `pnpm db:bootstrap`, `pnpm dev`.
2. Entra como administrador y crea en `/admin/departamentos` un departamento, y en `/admin/usuarios` un
   `ENCARGADO` y al menos un `MIEMBRO` de ese departamento.
3. Prueba el flujo: el encargado crea la tarea en `/tareas/nueva`, el miembro la avanza y el encargado la termina.
4. Antes de abrir un Pull Request: `pnpm check` y `pnpm test:sprint4` (con `pnpm dev` corriendo; en Windows,
   si hay `ECONNREFUSED`, ejecuta `$env:TEST_BASE_URL="http://localhost:5173"` antes de las pruebas).
