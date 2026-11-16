# Fase 3: persistencia de datos

Validación del 12 de noviembre de 2026, Docker Desktop con motor Linux amd64.

## Implementación

- Compose conserva un solo servicio y monta el volumen local administrado
  `workflow_data` en `/var/lib/workflow`. WORKFLOW_VOLUME_NAME permite aislar
  pruebas, sin configurar nada para el profesor.
- PostgreSQL, la contraseña interna y las credenciales iniciales viven allí.
  `/app/uploads` es un enlace interno a `/var/lib/workflow/uploads` para mantener
  las rutas y funciones de adjuntos existentes.
- PostgreSQL y Node conservan sus usuarios separados. El supervisor prepara
  solamente los directorios internos necesarios, sin permisos recursivos sobre
  el código o la carpeta compartida.
- Un bloqueo exclusivo evita dos instancias sobre el mismo volumen.
- Solo se inicializa un directorio de base vacío. Se rechazan datos sin PG_VERSION,
  versiones distintas de PostgreSQL 16 y una base existente sin db-password.
- Se mantienen migraciones versionadas y bootstrap transaccional. Los cambios de
  variables no restablecen las credenciales guardadas ni vuelven a crear cuentas.

## Pruebas ejecutadas

Se utilizó una imagen construida desde esta revisión, workflow:phase3, y un
volumen nuevo `workflow-phase3-test-20261112`, sin tocar datos reales.

1. Arranque sin red, con el volumen vacío: crea base, ocho migraciones y el
   administrador admin@utslp.com / Pass123456. Healthcheck correcto.
2. `verify.mjs`: login, permisos, departamentos, usuarios, proyecto, tarea,
   revisión, carga/descarga de adjunto y fuentes locales: aprobado.
3. Inspect confirma Type=volume, Driver=local y destino /var/lib/workflow.
4. Una segunda instancia con el mismo volumen sale con código 1 por bloqueo.
   La primera conserva su salud.
5. Se detiene y elimina únicamente el contenedor creado para la prueba,
   verificando antes su ID. No se elimina el volumen.
6. Se crea otro contenedor, sin red, con el mismo volumen y variables de
   contraseñas/correo distintas para comprobar que no sobrescriben lo guardado.
7. `verify.mjs check`: conserva usuarios, tarea terminada, contenido del adjunto,
   hash del administrador, credenciales originales y ocho migraciones: aprobado.
8. Healthcheck de la instancia recreada: aprobado. Se detiene ordenadamente.

Con otro volumen de prueba (`workflow-phase3-invalid-20261112`) se verificaron:

| Caso | Resultado |
| --- | --- |
| Directorio no vacío sin PG_VERSION | Rechazo, sin reinicializar |
| PG_VERSION=17 | Rechazo, sin convertir o borrar |
| PG_VERSION=16 sin archivo de contraseña | Rechazo, sin regenerar contraseña |
| Archivo marcador entre pruebas negativas | Conservado |
| Compose renderizado | Un servicio, volumen workflow_data y montaje de tipo volume |
| Construcción de imagen | Correcta |
| git diff --check | Correcto |

Los contenedores restantes están detenidos; los dos volúmenes de prueba se
conservaron. No se eliminaron volúmenes ni se migraron instalaciones existentes.

## Límites y pendientes

- La recreación probada utiliza la misma imagen y esquema. No valida futuras
  migraciones, cambios mayores de PostgreSQL ni rollback a un esquema anterior.
- El informe de fase 2 sigue siendo histórico; su limitación de persistencia
  queda resuelta para instalaciones nuevas que monten este volumen.
- Un contenedor antiguo sin volumen no recibe persistencia retroactivamente.
  No debe recrearse sin transferir sus datos de forma consistente y autorizada.
- Los volúmenes viven en el equipo Docker. Perder ese almacenamiento también
  pierde los datos: no sustituyen los respaldos de la fase 5.
- Construcción sobre SMB real, transferencia de imagen, otras plataformas y
  pruebas integrales restantes pertenecen a las siguientes fases.
