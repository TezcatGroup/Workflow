# Correcciones y pantallas completadas — 16 de noviembre de 2026

## Resultado actual

Los dos errores de concurrencia documentados en FUNCTIONAL_VALIDATION.md están
corregidos y sus reproducciones pasan. Se completaron Departamentos, Auditoría y
Mi equipo con la identidad visual existente. Usuarios incorpora eliminación real
de cuentas, además de activación/desactivación.

Imagen verificada: workflow:2026.11.16-r2, Linux amd64, ID
sha256:0e70508694814190af88e8e41f2074646891da20f27548e1e814e7fa9388e4f0.
Instancia aislada: workflow-fixes-20261116, volumen workflow_fixes_20261116,
http://localhost:3001. La instancia anterior de localhost:3000 no se sustituyó
ni detuvo, atendiendo la petición de conservarla durante la revisión.

## Cambios

- Tienda y Perfil bloquean la misma fila de usuario antes de consultar y
  descontar su saldo. Compras de artículos diferentes comparten ese bloqueo.
- Resolver un canje bloquea primero su fila y vuelve a comprobar PENDIENTE.
  Cancelar bloquea también la recompensa antes de restituir stock. Todo queda en
  la misma transacción: estado, devolución de monedas, inventario y auditoría.
- Departamentos: encabezado común, creación/edición, estado, búsqueda, filtros,
  contadores, respuestas de éxito/error, indicador de envío y estados vacíos.
- Auditoría: nombres de personas, filtro por acción/búsqueda, detalles plegables,
  información legible en móvil y aclaración del límite de 100 eventos recientes.
  Se conserva el registro completo en la base; la vista es de solo lectura.
- Mi equipo: encabezado común, departamento, directorio de cuentas activas,
  identificación de la cuenta propia, filtros por nombre/rol y estados vacíos.
- Usuarios: botón Eliminar cuenta y diálogo accesible con confirmación de correo,
  cancelación, estado de envío y errores. Se conservaron las demás operaciones.

## Eliminación de cuentas

La comprobación se realiza también en el servidor, dentro de una transacción:

- Solo ADMIN; no permite eliminar su propia cuenta.
- Exige que el correo escrito coincida con la cuenta seleccionada.
- Bloquea las cuentas del actor y destinatario en orden estable y verifica otra
  vez que el actor siga siendo administrador activo.
- Rechaza cuentas con tareas no terminadas como responsable/revisor, o con canjes
  PENDIENTES. Primero deben resolverse; desactivar sigue disponible.
- Elimina la fila de usuario y sus sesiones/notificaciones/datos personales de
  gamificación y canjes resueltos según las claves foráneas existentes.
- Conserva tareas, mensajes y archivos; sus referencias al usuario pasan a null.
- Conserva en auditoría nombre, correo, rol e ID de la cuenta eliminada, sin hash
  de contraseña. Antes de borrar, añade esa identidad a los eventos históricos
  vinculados. Registra una sola operación USUARIO_ELIMINADO.

No se ejecutaron eliminaciones sobre cuentas reales del contenedor del usuario.
No se añadieron migraciones ni se modificó el esquema de la base de datos.

## Verificación

| Prueba | Resultado |
| --- | --- |
| pnpm check | 0 errores, 0 advertencias |
| Construcción Docker | Correcta |
| Sprint 1 / Sprint 4 / muro / gamificación | Aprobadas; 8/8 y 10/10 en las primeras dos |
| Suite funcional extendida sobre imagen final | 10 grupos aprobados |
| Ocho compras simultáneas con saldo para una | Una respuesta 200, siete 400, saldo final 0 |
| Ocho cancelaciones del mismo canje de 40 monedas | Un solo reembolso de 40 |
| Compras simultáneas mezclando Tienda y Perfil | Un solo canje, saldo final 0 |
| Entregar y cancelar simultáneamente | Una sola resolución y una sola entrada de auditoría |
| Cancelar varios canjes del mismo artículo | Stock original restaurado completamente |
| Eliminación de cuenta por HTTP y comprobación SQL | Permisos, confirmación, pendientes, repetición, sesiones, historial, adjuntos y auditoría aprobados |
| Dos administradores intentan eliminarse entre sí simultáneamente | Solo una eliminación, sin interbloqueo; el otro intento no elimina al superviviente |
| Navegador: Departamentos | Crear, editar estado, filtrar, ausencia de resultados y restablecer |
| Navegador: Auditoría | Nombres, filtros, detalles, identidad eliminada y estados vacíos |
| Navegador: Mi equipo | Filtros, cuenta propia, resultados y estados vacíos |
| Navegador: eliminación | Confirmación incorrecta deshabilitada, cancelar conserva cuenta, confirmar elimina, cuenta propia deshabilitada, error por tareas pendientes visible |
| Escritorio 1440 × 1000 / móvil 390 × 844 | Capturas inspeccionadas, sin desbordamiento horizontal del documento |
| Excepciones JavaScript en recorrido de UI | Ninguna |
| Detector de diseño sobre pantallas modificadas | Sin hallazgos |

Las pruebas de regresión usan cuentas nuevas, llamadas HTTP y consultas SQL para
verificar invariantes; las pruebas visuales usan Python Playwright y Chromium.
La suite de eliminación se ejecuta con pnpm test:user-deletion después de generar
fixtures mediante pnpm test:functional, con WORKFLOW_TEST_ONLY=1 y las variables
descritas en FUNCTIONAL_VALIDATION.md. Solo ejecutar sobre una instancia aislada.
Las pruebas nuevas quedan en scripts/verify-concurrency.mjs y
scripts/verify-user-deletion.mjs; fallan con código 1 si se rompe una aserción.

Evidencias: C:\Users\black\Downloads\workflow-fixes-20261116. No se incluyen
sesiones del navegador ni datos de prueba en Git o en la entrega.

## Entrega y límites

La entrega actualizada usa la etiqueta y TAR 2026.11.16-r2. Los paquetes anteriores
se conservan sin sobrescribir. La carpeta de entrega es
C:\Users\black\Downloads\workflow-2026.11.16-r2-linux-amd64.
Las cuentas iniciales siguen siendo admin@utslp.com / Pass123456.

La aplicación en 3001 contiene datos sintéticos y no es una copia de los datos
de 3000. No se actualizará el contenedor original durante la revisión sin la
indicación del usuario. Los comandos del README sirven para instalaciones nuevas;
actualizar una instalación existente requiere conservar su volumen y respaldo.

Esto valida las reproducciones y flujos enumerados, no garantiza ausencia de
otros defectos. No se repitió SMB para estos cambios de aplicación, ni macOS,
ARM64, carga sostenida o todas las combinaciones de permisos y concurrencia.
