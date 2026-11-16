# Fase 2: resultados del 12 de noviembre de 2026

## Cambios

- Dockerfile raíz y universitario equivalentes: frontend compilado, backend,
  PostgreSQL 16, dependencias de producción, fuentes y migraciones en una imagen.
- Compose predeterminado con un solo servicio. Eliminado el bind mount de drizzle;
  el archivo adicional antiguo ya no introduce servicios ni montajes.
- Contexto con lista de archivos permitidos; sin secretos, volcados ni node_modules
  del anfitrión. Se conserva el lockfile.
- Inicio automático sin .env: administrador con contraseña aleatoria de 32
  caracteres, guardada con permisos 0600 y mostrada solo mediante access.mjs.
- Servidor HTTP con origen derivado del Host y cabecera de protocolo interna
  sobreescrita. No se desactiva CSRF. ORIGIN explícito opcional para HTTPS.
- Bootstrap universitario transaccional; el bootstrap de desarrollo tampoco
  restablece contraseñas, roles o estado de cuentas existentes.
- README con un bloque de dos comandos Docker portable y reutilización del
  contenedor mediante --no-recreate. Guía detallada en DOCKER_DEPLOYMENT.md.

## Pruebas ejecutadas

Entorno: Windows, Docker Desktop, motor Linux amd64, Node 22 y PostgreSQL 16.16.
Los contenedores de prueba se crearon con nombres nuevos, sin datos reales.

| Prueba | Resultado |
| --- | --- |
| pnpm check | 0 errores y 0 advertencias |
| Construcción Docker multietapa | Correcta |
| Compose básico y combinación antigua | Solo servicio app, sin configuración obligatoria |
| Arranque automático sin variables ni .env | Correcto; genera credenciales y ocho migraciones |
| Script access.mjs | Espera disponibilidad y muestra credenciales; omitidas de este informe |
| Healthcheck | HTTP y PostgreSQL correctos |
| Prueba funcional verify.mjs | Login, permisos, departamentos, usuarios, proyecto, tarea, revisión, adjuntos y fuentes: aprobados |
| Host localhost, hostname e IP simulados mediante HTTP | Login correcto sin ORIGIN explícito |
| Cabecera de protocolo falsificada | Sobreescrita por el servidor |
| Origen ajeno | Rechazado con 403, CSRF activo |
| Permisos de initial-admin.json | 0600 |
| Repetir up --no-recreate | Mismo ID de contenedor |
| Reinicio | Conserva datos, adjuntos, hash del administrador y ocho migraciones |
| Reinicio sin conexión a ninguna red Docker | Arranque y verificación correctos |
| Independencia del repositorio | Mounts=[]; aplicación y pruebas funcionan sin montajes |
| Procesos | Node con UID 1000 y PostgreSQL con su usuario; supervisor y tini root |
| Empaquetado revisado | Sin .env, volcados, tsx ni Vite en la imagen de la primera revisión de fase 2; receta de empaquetado conservada |

La imagen final se etiquetó localmente como workflow:phase2 y workflow:local.
No se publicó en registros externos. Los contenedores de prueba quedaron detenidos;
no se eliminaron volúmenes ni contenedores existentes.

## Incidencias y límites

- La primera consulta de salud de la revisión inicial se adelantó al bootstrap;
  tras completar la inicialización pasó. access.mjs espera a que la web esté lista.
- La prueba manual de Host se ajustó para usar node:http (Host explícito) y Accept
  text/html, en vez de asumir el comportamiento de fetch. El resultado final
  indicado arriba corresponde a esa prueba corregida.
- El build emite una advertencia inicial sobre .svelte-kit/tsconfig.json, que se
  genera durante la compilación; la construcción termina correctamente.
- Se probaron hosts/IP en peticiones, no un segundo equipo físico de la LAN.
- No se reprodujo el fallo del profesor ni se construyó sobre un montaje SMB real.
- No se probaron macOS, Linux nativo ni ARM64. Los comandos son comunes a Docker
  Compose v2, pero esos entornos quedan pendientes de ejecución real.
- No hay WebSockets en el proyecto actual; se conserva su comunicación HTTP.
- La conservación al eliminar/recrear el contenedor NO está implementada aún:
  corresponde a la fase 3 con workflow_data. Tampoco se migraron datos del Compose
  anterior. No ejecutar down ni force-recreate con datos importantes.
- Respaldo/restauración, exportación/importación y la batería integral de fase 6
  quedan pendientes de sus fases. Este informe no certifica toda la aplicación.

## Ajuste posterior: credenciales solicitadas

El 12 de noviembre se sustituyó la generación aleatoria inicial por los valores
públicos de demostración solicitados: admin@utslp.com / Pass123456 para la app y
el usuario de PostgreSQL. La base continúa llamándose workflow. Las referencias
a contraseñas aleatorias de las pruebas anteriores describen la revisión previa.

Se reconstruyó la imagen y se probó en un contenedor nuevo sin red: inicio
con las credenciales exactas, conexión TCP PostgreSQL con ese usuario/contraseña,
healthcheck, suite funcional y conservación tras reiniciar: aprobados.
No se restablecieron credenciales ni se recrearon instalaciones existentes.
