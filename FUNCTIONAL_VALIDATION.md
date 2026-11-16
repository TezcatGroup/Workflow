# Validación funcional por roles — 16 de noviembre de 2026

## Resultado

**Actualización:** los fallos F-01 y F-02 reproducidos abajo fueron corregidos en
2026.11.16-r2. Sus cinco pruebas de regresión pasan. Consulta
[las correcciones y su validación](FIXES_VALIDATION.md). Lo que sigue conserva
los resultados históricos sobre la imagen 2026.11.16 anterior.

La aplicación **no está completamente aprobada**: se reprodujeron dos errores
de concurrencia en canjes. Las pruebas de operaciones individuales y los flujos
descritos abajo pasaron. No se modificó la lógica de negocio para ocultar fallos.

Se probó la imagen workflow:2026.11.16, código de aplicación c56e716, en el
contenedor exclusivo workflow-functional-20261116, puerto local 13028 y volumen
workflow_functional_20261116. Se crearon datos sintéticos; la instancia SMB que
el usuario revisa en localhost:3000 permaneció funcionando y sin cambios.

## Cobertura ejecutada

| Área | Roles y comprobaciones | Resultado |
| --- | --- | --- |
| Autenticación | Login, sesión, logout, cuenta inactiva, bloqueo por intentos, acceso anónimo | Sprint 1: 8/8 |
| Administración | Usuarios: alta, edición, estado; departamentos: alta/edición; auditoría; rechazo de otros roles | Aprobado |
| Páginas y permisos | 14 rutas × ADMIN/ENCARGADO/MIEMBRO; accesos anónimos a rutas operativas y aislamiento de equipo | Aprobado |
| Tareas obligatorias | Alta, validaciones, responsables/revisores, estados, checklist doble, devolución con observaciones, aprobación, historial y permisos | Sprint 4 actualizado: 10/10 |
| Etiquetas y muro | Catálogo persistente, tareas opcionales, aislamiento, toma concurrente, conversión, recompensas y acreditación única | Suite muro aprobada |
| Gamificación | XP, monedas, ramas, nivel, insignias, especialidades, radar y contribuciones | Suite gamificación aprobada |
| Mensajes | Comentario, mensaje rápido, persistencia, campos vacíos/largos, rechazo de terceros y ADMIN | Aprobado |
| Adjuntos | Subida/descarga, contenido, acceso anónimo y ajeno, enlaces HTTP, rechazo de javascript:, eliminación por autor/encargado | Aprobado |
| Reasignación | Solicitar, duplicados, motivo requerido, rechazar con mensaje, aprobar, otro departamento, antiguo responsable en solo lectura y plazo vencido | Aprobado |
| Notificaciones | Eventos, lectura individual/total mediante página/API, aislamiento, próximas a vencer, vencidas y deduplicación | Aprobado |
| Temporizador automático | Tarea próxima a vencer creada en la base; espera sin HTTP ni botón de revisión; una alerta generada después de 250 segundos de observación | Aprobado |
| Actualización automática | Mensaje de encargado aparece al miembro sin recargar (10.69 segundos); siguiente consulta periódica de notificaciones contiene el mensaje | Aprobado |
| Límites de archivos | Guía inicial de 1 KiB guardada; guía y adjunto de 10 MiB + 1 rechazados sin crear tarea/metadatos indebidos | Aprobado |
| Recompensas | Crear, editar, desactivar/reactivar, costo inválido, restricciones por rol | Aprobado |
| Canjes individuales | Saldo insuficiente, tienda/perfil, stock, entrega, cancelación, reembolso, repetición secuencial rechazada | Aprobado |
| Eliminación de tarea | Rechazo a miembro, eliminación por encargado, cascada de mensajes y detalle 404 | Aprobado |
| Navegador | 20 páginas autorizadas entre tres roles; tarea completa de creación a aprobación; usuarios/departamentos, compra confirmada, búsqueda, lectura de notificaciones y logout | Aprobado |
| Canjes simultáneos entre artículos distintos | No gastar más monedas que el saldo disponible | **Falla F-01** |
| Cancelación simultánea del mismo canje | Un solo reembolso y devolución de stock | **Falla F-02** |

La suite extendida contiene diez grupos aprobados; cada grupo verifica varias
peticiones y estados persistidos. La matriz de rutas incluye respuestas 303 y
403 esperadas. El middleware redirige a /dashboard a quien intenta acceder a
administración sin ser ADMIN; no se confunde una redirección con acceso permitido.

Sprint 4 fallaba porque enviaba a revisión sin completar criterios, devolvía sin
observaciones y aprobaba sin verificación del encargado. Se actualizaron esas
precondiciones y se añadieron las comprobaciones negativas correspondientes.
No se debilitó ninguna regla del servidor. Este resultado sustituye el pendiente
de esa suite en los informes históricos de fases 5 y 6.

## F-01 — saldo negativo con compras simultáneas

En /tienda?/canjear, un MIEMBRO con 40 monedas envió ocho solicitudes simultáneas
para artículos diferentes, cada uno de 40 monedas. Las ocho devolvieron 200 y
el saldo persistido terminó en **−280**. Se esperaba como máximo una compra.

El bloqueo actual protege la fila del artículo, pero dos artículos diferentes
no comparten ese bloqueo. La lectura del saldo y su descuento no están
serializados por usuario. /perfil?/canjear contiene un flujo equivalente; la
reproducción simultánea se ejecutó sobre /tienda, no sobre ambos endpoints.

Corrección pendiente: serializar los movimientos de saldo por usuario dentro de
la transacción y mantener la misma regla en todos los endpoints de canje.

## F-02 — reembolso múltiple de un mismo canje

Se enviaron ocho cancelaciones simultáneas de un único canje pendiente de 40
monedas a /admin/recompensas?/resolverCanje. Las ocho devolvieron 200 y el saldo
aumentó **320 monedas**, cuando debía aumentar únicamente 40. Repetir la
cancelación secuencialmente sí fue rechazado en la prueba individual.

La resolución lee PENDIENTE sin bloquear esa fila antes de decidir. Corrección
pendiente: transición atómica o bloqueo de la fila del canje, con reembolso,
stock y auditoría en la misma transacción. Debe comprobarse también la carrera
entre entregar y cancelar; esa combinación específica no se ejecutó aquí.

## Reproducción y evidencias

Usar exclusivamente una base/instancia aislada. Las suites existentes necesitan
DATABASE_URL, TEST_BASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD. La suite extendida
exige además WORKFLOW_TEST_ONLY=1 y conserva sus datos para inspección:

```text
pnpm test:functional
pnpm test:concurrency
```

Para ejecutar fuera de Linux, define TEST_REPORT y TEST_FIXTURES con rutas locales
de escritura y TEST_CONCURRENCY_REPORT para el informe de concurrencia.
Por defecto la suite extendida escribe /tmp/functional-report.json
y /tmp/functional-fixtures.json. La suite de concurrencia consume esas cuentas:
ejecuta primero la extendida para generar cuentas nuevas y corre concurrencia
una sola vez por conjunto. No ejecutar sobre producción. Los fallos provocan
código de salida 1 y se registran; no se convierten en éxitos.

Pruebas ejecutadas dentro de la imagen con los cuatro scripts TypeScript
empaquetados temporalmente con esbuild; scripts adicionales copiados únicamente
al contenedor de prueba. No se añadieron dependencias de desarrollo a la imagen.
Navegador: Python Playwright, Chromium headless, sesiones independientes por rol.
Se inspeccionaron los formularios renderizados antes de automatizar sus acciones.

Evidencias locales: C:\Users\black\Downloads\workflow-functional-20261116.
Incluyen logs por suite, functional-report.json, concurrency-report.json,
browser-results.json, browser-actions.json, scripts de navegador y capturas.
Los archivos de sesión son privados y no se incluyen en Git ni en la entrega.
También se conservaron scheduler-report.json, polling-report.json y
attachment-limits.json. El temporizador se observó dentro de su ciclo real de
diez minutos: los 250 segundos son la espera restante desde la creación de la
tarea de prueba, no una modificación del intervalo. pnpm check terminó con
cero errores y cero advertencias.

## Límites

La cobertura comprende las familias de funciones implementadas y los flujos
enumerados, no todas las combinaciones posibles de entradas o carga. No es una
garantía de ausencia de defectos ni una auditoría de seguridad/accesibilidad.
No se probó cada interacción visual con cada rol: se combinaron navegador,
HTTP y consultas SQL para comprobar resultados. No hay CRUD de proyectos por
interfaz ni servicio WebSocket implementados; no se declaran aprobados.
No se hicieron pruebas de carga sostenida, navegadores distintos de Chromium,
correo externo, macOS o ARM64. Los dos errores reproducidos quedan pendientes
de corrección y de repetir sus pruebas antes de declarar aprobada la entrega.
