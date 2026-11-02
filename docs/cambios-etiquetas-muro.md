# Cambios: etiquetas, muro, detalle completo y recompensas

Fecha: 2 de noviembre de 2026.
Proyecto: Tezcat Workflow.

## 1. Objetivo y resultado

Se conectaron las pantallas de etiquetas y muro con PostgreSQL y se adaptó la creación de tareas para distinguir entre obligatorias y opcionales. Los cambios abarcan interfaz, acciones de servidor, reglas de negocio, esquema, migración y pruebas de integración. Esta versión incluye etiquetas en el detalle, configuración de EXP y monedas y acreditación de recompensas en la cuenta del responsable.

| Apartado | Comportamiento anterior | Comportamiento implementado |
| --- | --- | --- |
| Admin / Etiquetas | Mostraba ejemplos y simulaba el guardado. | Crea, edita y activa o desactiva etiquetas persistentes por departamento. |
| Encargado / Crear tarea | El servidor siempre creaba una obligatoria y exigía responsable. | Respeta el tipo seleccionado; una opcional se crea sin responsable. |
| Muro | Mostraba oportunidades de ejemplo. | Consulta tareas opcionales disponibles del departamento del usuario. |
| Encargado / Convertir | Simulaba una conversión con futura asignación aleatoria. | Convierte en obligatoria y asigna al miembro elegido por el encargado. |
| Miembro / Tomar tarea | El botón no ejecutaba una acción real. | Permite desplegar la descripción completa y tomar la tarea. |

## 2. Uso por rol

### Administrador: administrar etiquetas

1. Entrar en `/admin/etiquetas`.
2. Capturar nombre, categoría y departamento.
3. Pulsar **Crear etiqueta**.
4. Usar los controles del listado para modificar nombre, categoría o estado y guardar.

El catálogo se obtiene de la base de datos al cargar la página. Las categorías admitidas son `LENGUAJE DE PROGRAMACIÓN` y `FRAMEWORK`. El nombre debe tener entre 1 y 60 caracteres, tras quitar espacios en los extremos.

No se permite repetir exactamente el mismo nombre dentro de un departamento. El índice actual distingue mayúsculas y minúsculas. Una etiqueta desactivada permanece almacenada, pero deja de ofrecerse al crear tareas y deja de mostrarse como etiqueta activa en el muro. Sus relaciones existentes con tareas no se eliminan.

### Encargado: publicar una tarea opcional

1. Entrar en `/tareas/nueva` y seleccionar **Opcional**.
2. Completar los datos de la tarea y su fecha límite.
3. Seleccionar, si corresponde, etiquetas activas del propio departamento.
4. Definir la experiencia (EXP) y las monedas que recibirá el responsable al aprobarse la tarea; usar 0 si no ofrece recompensa.
5. Pulsar **Crear tarea opcional**.

El servidor guarda `tipo = OPCIONAL`, `responsable_id = NULL` y el departamento del encargado. El estado inicial sigue siendo `ASIGNADA`, reutilizando el flujo existente; la disponibilidad en el muro depende también de que no exista responsable. No se agregó un estado de publicación nuevo.

El revisor predeterminado es el encargado que crea la tarea. Las validaciones existentes de título, descripción, fecha límite, prioridad, dificultad, proyecto y criterios siguen aplicándose. La creación de la tarea, sus criterios, sus etiquetas y el evento inicial se realiza en una transacción. Los archivos guía conservan su proceso de registro posterior a la creación.

Después de crear una opcional, la aplicación redirige a `/muro`. Una tarea obligatoria sigue exigiendo responsable y redirige a su detalle.

### Encargado: convertir y asignar

1. Entrar en `/muro`.
2. Pulsar **Convertir en obligatoria** en una tarea disponible.
3. Revisar la descripción y seleccionar un miembro activo del departamento.
4. Confirmar con **Convertir y asignar**.

El servidor cambia el tipo a `OBLIGATORIA`, asigna al miembro seleccionado y registra el evento `TAREA_CONVERTIDA`. La tarea conserva el estado inicial `ASIGNADA` y deja de aparecer en el muro. El responsable la encuentra en su apartado de tareas.

La selección es explícita: no se utiliza asignación aleatoria. Si no hay miembros activos, el formulario informa la situación y deshabilita la confirmación.

### Miembro: revisar y tomar una tarea

1. Entrar en `/muro`.
2. Abrir **Ver descripción completa y tomar tarea**.
3. Leer la descripción sin el recorte de la tarjeta.
4. Pulsar **Tomar tarea** dentro del panel desplegado.

El servidor asigna la tarea al usuario autenticado y registra `TAREA_TOMADA`. Su tipo continúa siendo `OPCIONAL` y su estado continúa siendo `ASIGNADA`; tomarla no inicia automáticamente el trabajo. La aplicación redirige a su detalle, desde donde continúa el flujo normal.

Una vez tomada, la tarea desaparece del muro y aparece en las tareas del responsable. El panel permite leer la descripción antes de confirmar; no se registra ni se exige una comprobación de lectura en el servidor.

### Detalle completo de una tarea

Al abrir una tarea en `/tareas/[id]` se muestran sus etiquetas y recompensas, además de sus datos de trabajo. El detalle conserva las etiquetas asignadas aunque posteriormente se desactiven en el catálogo: aparecen marcadas como inactivas.

Las recompensas se muestran únicamente en tareas opcionales. La vista presenta número y título, tipo y estado, descripción completa, responsable, revisor, creador, proyecto, departamento, prioridad, dificultad, fecha límite, creación, última actualización, requisitos, impacto, tiempo estimado, EXP y monedas. También mantiene criterios de aceptación, archivos, conversación e historial. Los campos sin contenido muestran un texto como “Sin especificar”; los importes nulos de tareas antiguas se presentan como 0.

Requisitos, impacto y tiempo estimado se leen de las columnas existentes cuando tienen contenido; esta ampliación no agrega controles de captura para esos tres campos al formulario de creación. Los identificadores internos se usan para relaciones y navegación, mientras que la pantalla presenta los nombres correspondientes.

### Recompensas en la cuenta del responsable

La EXP y las monedas se almacenan asociadas al usuario que figura como responsable al aprobar la tarea. No se asignan al creador ni al revisor por realizar la aprobación.

1. El encargado configura los importes al publicar una tarea opcional.
2. El miembro toma la tarea, la realiza y la envía a revisión.
3. El revisor verifica los criterios y aprueba el paso de `EN_REVISION` a `TERMINADA`.
4. En la misma transacción se registran la aprobación y los movimientos de EXP y monedas del responsable.
5. En `/perfil`, el usuario puede consultar su experiencia acumulada y su saldo de monedas. La EXP también alimenta el cálculo existente del dashboard.

Iniciar la tarea o enviarla a revisión no entrega recompensas. Si dos aprobaciones llegan simultáneamente, solo una cambia el estado y acredita los importes. Una tarea terminada no admite otra aprobación en el flujo actual.

Los valores admitidos son enteros de 0 a 2147483647; el servidor rechaza negativos, decimales, texto y valores fuera de rango. Un campo omitido se interpreta como 0. Al convertir una opcional en obligatoria se eliminan los importes ofrecidos. Las tareas obligatorias no muestran EXP ni monedas en su detalle y nunca generan abonos, incluso si conservan importes de datos anteriores. Las tareas creadas directamente como obligatorias mantienen las recompensas nulas y no aceptan importes enviados artificialmente desde el cliente.

## 3. Base de datos

Migración: `drizzle/0007_etiquetas_muro.sql`.

### Enum `categoria_etiqueta`

Valores: `LENGUAJE DE PROGRAMACIÓN`, `FRAMEWORK`.

### Tabla `etiquetas`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | UUID | Clave primaria, generada automáticamente. |
| `nombre` | VARCHAR(60) | Obligatorio. |
| `categoria` | categoria_etiqueta | Obligatoria. |
| `departamento_id` | UUID | Obligatorio; referencia a `departamentos.id`. |
| `activo` | BOOLEAN | Obligatorio; valor inicial `true`. |

Índice único: `etiquetas_departamento_nombre_idx`, sobre departamento y nombre. La eliminación de un departamento elimina sus etiquetas mediante `ON DELETE CASCADE`.

### Tabla `tarea_etiquetas`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `tarea_id` | UUID | Obligatorio; referencia a `tareas.id`. |
| `etiqueta_id` | UUID | Obligatorio; referencia a `etiquetas.id`. |

Índice único: `tarea_etiquetas_unica_idx`, sobre ambos campos. Evita asociar dos veces la misma etiqueta a una tarea. Ambas referencias usan `ON DELETE CASCADE`: eliminar una tarea o etiqueta elimina sus asociaciones.

La tabla `tareas` ya admitía el tipo `OPCIONAL` y un responsable nulo, por lo que no fue necesario modificar sus columnas. También se actualizaron el esquema Drizzle, el registro de migraciones y el snapshot `0007_snapshot.json`.

La migración agrega estructuras y conserva los datos existentes. No convierte tareas antiguas ni transforma los ejemplos de la interfaz en registros reales.

### Almacenamiento de recompensas

Esta ampliación reutiliza estructuras existentes; no requiere otra migración después de `0007_etiquetas_muro`:

| Estructura | Uso |
| --- | --- |
| `tareas.xp_ofrecido` | EXP prometida al completar la tarea. |
| `tareas.puntos_ofrecidos` | Monedas prometidas; “puntos” es el nombre interno existente. |
| `movimientos_xp` | Abonos de EXP vinculados a usuario y tarea, con cantidad, motivo y fecha. |
| `movimientos_puntos` | Abonos de monedas vinculados a usuario y tarea, con cantidad, motivo y fecha. |

El saldo de la cuenta se calcula sumando los movimientos del usuario. No se agregó un saldo duplicado a `usuarios`. Los importes 0 no generan movimientos. Las referencias existentes a tareas usan `ON DELETE SET NULL`, por lo que eliminar la tarea no borra el abono de la cuenta. No se realiza acreditación retroactiva de tareas ya terminadas antes de este cambio.

## 4. Backend y permisos

Las operaciones son acciones de formulario de SvelteKit, no una API REST independiente.

| Acción POST | Permiso | Datos principales | Resultado |
| --- | --- | --- | --- |
| `/admin/etiquetas?/crear` | ADMIN | `nombre`, `categoria`, `departamentoId` | Guarda una etiqueta. |
| `/admin/etiquetas?/actualizar` | ADMIN | `id`, `nombre`, `categoria`, `departamentoId`, `activo` | Actualiza una etiqueta. |
| `/tareas/nueva?/crear` | ENCARGADO con departamento | Datos de tarea, `tipo`, `xpOfrecido`, `puntosOfrecidos`, campos repetidos `etiquetas` con UUID | Crea una tarea del tipo indicado. |
| `/muro?/tomar` | MIEMBRO activo del departamento | `tareaId` | Asigna al usuario autenticado y redirige al detalle. |
| `/muro?/convertir` | ENCARGADO del departamento | `tareaId`, `responsableId` | Convierte y asigna al miembro elegido. |

`crearTarea` sustituye a `crearTareaObligatoria` y maneja ambos tipos. Si no se envía tipo, mantiene `OBLIGATORIA` como valor predeterminado. Para una opcional, no utiliza un responsable enviado por el cliente. Valida que todas las etiquetas seleccionadas sean UUID válidos, estén activas y pertenezcan al departamento del encargado.

`opcionesParaCrear` carga las etiquetas activas del departamento. El formulario envía sus identificadores, en lugar de los nombres de los ejemplos anteriores, y conserva tipo y etiquetas en la respuesta de validación.

El cargador de `/muro` solo devuelve tareas que cumplan simultáneamente:

- Pertenecen al departamento del usuario autenticado.
- Son de tipo `OPCIONAL`.
- Están en estado `ASIGNADA`.
- No tienen responsable.

Se ordenan por fecha límite. El muro mantiene búsqueda por título y descripción y filtros por etiquetas. Un usuario sin departamento obtiene un listado vacío. La consulta actual no excluye tareas vencidas: la fecha se muestra con su indicación visual correspondiente.

`asignarDesdeMuro` centraliza la toma y conversión. Valida rol, departamento e identificadores, y comprueba que el destinatario sea un miembro activo del mismo departamento. La toma usa siempre la identidad de la sesión, no un responsable elegido por el cliente.

### Concurrencia y trazabilidad

La asignación usa una transacción que actualiza la tarea y registra su evento. El `UPDATE` vuelve a exigir que la tarea sea opcional, esté disponible, no tenga responsable y pertenezca al departamento correspondiente.

Si dos solicitudes compiten por la misma tarea, solo una puede actualizarla. La otra recibe un fallo de acción `409` con el mensaje de que la tarea ya no está disponible. Esto también aplica cuando una toma compite con una conversión.

Los eventos `TAREA_TOMADA` y `TAREA_CONVERTIDA` conservan tarea, actor y responsable asignado. La publicación utiliza el evento existente `TAREA_CREADA`.

### Detalle, aprobación y perfil

`obtenerDetalle` consulta las etiquetas relacionadas sin filtrar por estado activo, obtiene el nombre del departamento y devuelve los campos adicionales de la tarea, respetando los permisos de acceso existentes.

`cambiarEstado` registra los movimientos únicamente al aprobar la tarea. El cambio condicional de estado y los abonos pertenecen a la misma transacción: si falla la operación, se revierte todo. Los importes y el destinatario se toman de la base de datos, no del formulario de aprobación.

El cargador de `/perfil` suma los movimientos de EXP y monedas filtrando por el usuario autenticado y devuelve sus totales para mostrarlos en la cuenta.

## 5. Archivos afectados

| Archivo o grupo | Cambio |
| --- | --- |
| `src/lib/server/db/schema.ts` | Enum y tablas para etiquetas y asociaciones. |
| `drizzle/0007_etiquetas_muro.sql` | Migración versionada. |
| `drizzle/meta/_journal.json`, `drizzle/meta/0007_snapshot.json` | Registro y snapshot del esquema. |
| `src/lib/server/tareas.ts` | Creación según tipo, validación de recompensas, detalle ampliado, asignación y acreditación transaccionales. |
| `src/routes/admin/etiquetas/+page.server.ts` | Lectura, creación y actualización persistentes. |
| `src/routes/admin/etiquetas/+page.svelte` | Sustituye la copia simulada por datos del servidor. |
| `src/routes/tareas/nueva/+page.server.ts` | Usa `crearTarea`, conserva valores y redirige según tipo. |
| `src/routes/tareas/nueva/+page.svelte` | Catálogo real y envío de identificadores de etiquetas. |
| `src/routes/muro/+page.server.ts` | Consulta de oportunidades y acciones de toma y conversión. |
| `src/routes/muro/+page.svelte` | Datos reales, descripción completa y selección de responsable. |
| `scripts/verify-muro.ts` | Pruebas de integración con limpieza de datos temporales. |
| `src/routes/tareas/[id]/+page.svelte` | Etiquetas, recompensas e información adicional en el detalle. |
| `src/routes/perfil/+page.server.ts`, `src/routes/perfil/+page.svelte` | Consulta y presentación de EXP acumulada y saldo de monedas. |
| `package.json` | Comando `test:muro`. |
| `README.md` | Resumen funcional, migración y ejecución de pruebas. |

## 6. Aplicación de la migración y despliegue

En la instancia local se aplicó la migración a PostgreSQL y se reconstruyó y reinició la aplicación de Docker conservando el volumen de datos. La aplicación quedó accesible en `http://localhost:3001`.

Para actualizar otra instalación existente desde la raíz del repositorio:

```powershell
docker compose -f docker-compose.yml -f docker-compose.migrate.yml build app migrate
docker compose -f docker-compose.yml -f docker-compose.migrate.yml run --rm --no-deps migrate pnpm db:migrate
```

El segundo comando requiere que el servicio de base de datos esté iniciado. Una vez que la migración termine correctamente:

```powershell
docker compose up -d --no-deps app
```

Estos comandos ejecutan la migración sin llamar al bootstrap del administrador. Como alternativa, en desarrollo con `DATABASE_URL` configurada y PostgreSQL accesible, se puede ejecutar `pnpm db:migrate`.

## 7. Verificación realizada

Durante la implementación se completaron:

- `pnpm check`: cero errores y cero advertencias de Svelte/TypeScript.
- Compilación de producción mediante Docker: completada.
- `pnpm test:muro`: aprobado contra la instancia local.
- `git diff --check`: sin errores de espacios en el diff.
- Petición a `/login` después del reinicio: HTTP 200.

La prueba de integración cubre persistencia y duplicados de etiquetas, edición del estado, exclusión de etiquetas inactivas, creación opcional sin responsable, asociación de etiquetas, disponibilidad por departamento, descripción completa en la respuesta, toma por miembros, aparición en sus tareas, conversión con responsable y rechazo de acciones no autorizadas.

La prueba ampliada comprueba importes guardados y visibles, etiquetas en el detalle, rechazo de recompensas inválidas, ausencia de abonos antes de la aprobación, rechazo de la autoaprobación del miembro, destinatario e importes exactos de los abonos y saldos visibles en su perfil. También comprueba que dos aprobaciones simultáneas produzcan un solo abono de cada tipo. Para las obligatorias verifica que la conversión limpie los importes, que el detalle oculte las recompensas y que aprobar una tarea con importes antiguos no genere abonos.

También verifica dos solicitudes simultáneas de toma y una toma simultánea con una conversión. Comprueba que haya un solo ganador y un único evento de asignación además del evento inicial.

Para repetirla, configurar `DATABASE_URL` para la misma base de la aplicación y, si hace falta, `TEST_BASE_URL`. El valor predeterminado de esta última es `http://localhost:3001`.

```powershell
pnpm test:muro
```

La prueba crea departamentos, usuarios y sesiones temporales y elimina sus datos al finalizar mediante `finally`. No requiere usar la contraseña de una cuenta real. Las comprobaciones realizadas son de compilación e integración HTTP/base de datos; no incluyen una prueba visual automatizada en navegador.

## 8. Estado de entrega

Al elaborar este documento, los cambios funcionales, la migración y las pruebas están en el directorio de trabajo local, sin commit ni push. La migración sí fue aplicada a la base local. Un despliegue en otro entorno necesita recibir estos archivos y ejecutar la migración correspondiente.
