# Reporte técnico de estabilización de Workflow

Las nueve fases corrigieron 17 puntos de acceso, administración, tareas, notificaciones, recompensas y perfiles. Los cambios se integraron en la rama [fase-de-pruebas](https://github.com/TezcatGroup/Workflow/tree/fase-de-pruebas) y se desplegaron en [Workflow](https://workflow.tezcatgroup.com).

## Fase 1 · Acceso y cuentas

- **Google en producción.** Al contenedor le faltaba la configuración OAuth. Se agregó un secreto al cliente web que ya tenía autorizado el callback HTTPS y se configuró el entorno de Docker fuera de Git. Se verificó la redirección a Google y el acceso con contraseña. La prueba de fin a fin con Google requiere una cuenta activa de Workflow con el mismo correo de Gmail o Google Workspace.
- **Edición de usuarios.** El formulario restablecía los valores visibles al guardar y podía enviar el rol predeterminado en una edición posterior. Se inicializaron las opciones con los valores de cada cuenta y se desactivó el restablecimiento automático. En Chrome se cambió primero el departamento y luego el rol, comprobando que los demás campos se conservaran al recargar. [Commit 1c1df01](https://github.com/TezcatGroup/Workflow/commit/1c1df01)

## Fase 2 · Etiquetas y notificaciones

- **Etiquetas al editar tareas.** El editor permite agregar y quitar etiquetas. El servidor valida que cada etiqueta nueva esté activa y pertenezca al departamento. La edición guarda las etiquetas y registra los valores anteriores y posteriores en la misma transacción.
- **Avisos de eliminación y catálogo.** Eliminar una tarea avisa a los demás participantes activos. Publicar un producto avisa a quienes tienen acceso a la tienda. Los avisos se crean dentro de las transacciones correspondientes. Se comprobaron ambas alertas en el centro de notificaciones. [Commit 4323029](https://github.com/TezcatGroup/Workflow/commit/4323029)

## Fase 3 · Dashboard y editor

- **Botón de reclamo.** Se retiró «Reclamar tareas opcionales (+XP)» del Dashboard inicial y se eliminó el código del desplazamiento y resaltado asociado. El Muro conserva el flujo para tomar o convertir tareas.
- **Cierre del editor.** Se usó una clave estable de ID y versión y se pausó la actualización periódica mientras el editor está abierto. En Chrome se comprobó que el borrador sobrevive al intervalo de actualización y que el panel sigue abierto después de guardar. La actualización se reanuda al cerrarlo. [Commit 6eebe83](https://github.com/TezcatGroup/Workflow/commit/6eebe83)

## Fase 4 · Fecha límite y checklist

- **Cambio de fecha límite.** El formulario convierte a ISO la fecha y hora local que la persona seleccionó en el navegador. PostgreSQL guarda el instante con zona horaria. Se comprobó que, tras recargar, la hora local coincide con la seleccionada en Ciudad de México.
- **Permisos del checklist.** Solo el responsable asignado puede marcar el avance. El encargado o revisor verifica criterios únicamente en **En revisión**. Las comprobaciones de permisos y estado se coordinan con las transiciones usando un bloqueo de la fila de la tarea. Se probaron acciones válidas y rechazadas para ambos roles. [Commit 825c94c](https://github.com/TezcatGroup/Workflow/commit/825c94c)

## Fase 5 · Adjuntos y creación de tareas

- **Confirmación de borrado.** El control muestra el nombre del adjunto y pide confirmación antes de enviar la solicitud. En Chrome se comprobó que cancelar conserva el archivo y aceptar lo elimina.
- **Fecha opcional y criterios obligatorios.** La migración **0010_fecha_limite_opcional** admite fechas nulas. El servidor exige al menos un criterio de aceptación con contenido para tareas obligatorias y opcionales. El editor permite agregar o quitar la fecha y las vistas y alertas tratan las tareas sin fecha como tales. Se verificó que la migración conserve las tareas existentes. [Commit 76028ca](https://github.com/TezcatGroup/Workflow/commit/76028ca)

## Fase 6 · Apariencia y reasignación

- **Modo claro.** El encabezado ofrece un control para cambiar de tema. La aplicación aplica la paleta mediante variables CSS y guarda la preferencia en el navegador. Se probó su persistencia al navegar y recargar.
- **Tareas vencidas.** El plazo para solicitar que la tarea se asigne a otro compañero termina en el menor de dos límites, la ventana de reasignación o el vencimiento. La vista oculta la acción y el servidor valida de nuevo al recibir la solicitud. Se probó el rechazo desde una pestaña abierta antes del vencimiento. Una tarea sin fecha puede tener una sola solicitud pendiente. [Commit 1ec7345](https://github.com/TezcatGroup/Workflow/commit/1ec7345)

## Fase 7 · Contribuciones y recompensas

- **Contador de contribuciones.** La migración **0011_historial_contribuciones** incorporó las tareas aprobadas que seguían en la base. Cada aprobación nueva deja un registro único que sobrevive al borrado de la tarea, incluso si otorgó cero EXP y monedas. Las tareas eliminadas antes de migrar quedaron fuera del recuento histórico.
- **Pago de recompensas.** Tienda y Perfil comparten la operación que registra el canje pendiente, descuenta saldo y stock y avisa a los encargados activos del área. Estos pueden marcarlo como pagado desde Tienda. La transición se registra en auditoría. Se comprobaron permisos por departamento, descuentos concurrentes y resolución única. [Commit ac0f4cc](https://github.com/TezcatGroup/Workflow/commit/ac0f4cc)

## Fase 8 · Equipo y proyectos

- **Perfiles de compañeros.** Miembros y encargados pueden abrir perfiles de solo lectura de integrantes activos del mismo departamento. La vista comparte los cálculos del perfil propio y muestra foto, nombre, correo, rol, EXP, nivel, habilidades, insignias y contribuciones. El saldo y los canjes permanecen privados. Se probó el acceso entre compañeros y el rechazo desde otro departamento.
- **Tareas en proyectos.** Cada ficha muestra las tareas vinculadas, su estado y el enlace al detalle, incluso al archivar el proyecto. Las consultas aplican los permisos de departamento tanto al proyecto como a las tareas. Se verificaron los enlaces y el aislamiento entre áreas. [Commit 8231286](https://github.com/TezcatGroup/Workflow/commit/8231286) y [commit 4924db2](https://github.com/TezcatGroup/Workflow/commit/4924db2)

## Fase 9 · Ajustes de perfil

- **Ajustes plegables.** En Perfil, miembros y encargados abren **Ajustes de perfil** para ver los formularios de foto y contraseña. El control admite teclado y mantiene visibles los resultados de la operación. Se probaron el rechazo de una imagen inválida, el guardado y retiro de foto y el cambio de contraseña con cierre de sesión. [Commit 6c3e2c5](https://github.com/TezcatGroup/Workflow/commit/6c3e2c5)

## Despliegue y verificación

Workflow corre en Docker con PostgreSQL persistente en WSL. Cloudflare Tunnel publica el sitio por HTTPS y una tarea programada inicia el servicio con Windows. Se verificó el arranque automático tras un reinicio de la PC durante la instalación inicial. Antes de las migraciones de las fases 5 y 7 se respaldó PostgreSQL y se comprobó la conservación de los datos de prueba. La verificación del despliegue final incluyó el estado saludable del contenedor, un inicio de sesión por contraseña y la redirección OAuth de producción.
