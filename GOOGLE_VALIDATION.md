# Validación r4: acceso con Google y empaquetado del servidor

16 de noviembre de 2026. Rama Docker, Linux amd64 en Docker Desktop para Windows.

## Google y contraseña

- `pnpm check`: cero errores y advertencias.
- `scripts/verify-google-oauth.ts`: validación de configuración, state, PKCE,
  nonce, firma RS256, emisor, audiencia, vencimiento, correo verificado y
  autoridad Gmail/Workspace. Se usan claves y tokens locales de prueba.
- `scripts/verify-google-accounts.ts`: cinco grupos contra base aislada.
  Rechazo de correo desconocido sin crear usuario/sesión; acceso y contraseña
  conservados en ADMIN, ENCARGADO y MIEMBRO; rechazo de cuentas inactivas,
  bloqueadas, eliminadas o asociadas a otro sub; una sola vinculación ante dos
  identidades concurrentes. Roles, nombres y hashes originales conservados.
- Chromium/Playwright: login en 1440 × 1000 y 390 × 844, sin desbordamiento ni
  errores JavaScript. Contraseña funcional con/sin configuración Google;
  botón disponible solo en la dirección configurada; parámetros de redirección
  correctos; callback con state inválido rechazado.
- No existe cliente OAuth real todavía. No se probó una autorización real con
  Google ni se afirma que Google esté activado en el dominio publicado.
- Un intento de ejecutar el proveedor simulado en un contenedor fue rechazado
  por la revisión automática. No se ejecutó ni se incluyó en el repositorio;
  se usaron pruebas de protocolo y del servicio de cuentas separadas.

## Empaquetado y servidor

- La imagen `external` contiene drizzle.config.ts, bootstrap-admin.ts, el esquema,
  las migraciones y las herramientas. No necesita montajes temporales de código.
- Migración real en una base de prueba independiente: diez migraciones aplicadas.
- Bootstrap crea el administrador; al repetirlo con otra contraseña conserva la
  cuenta original. Login con la contraseña inicial: aprobado; con la nueva
  variable que no debía restablecerla: rechazado.
- Aplicación `external` sirve HTTP correctamente contra esa base independiente.
- La imagen predeterminada sigue siendo `standalone`, un contenedor con la base.
- Actualización real de un volumen de prueba restaurado de r3: pasa de nueve a
  diez migraciones y conserva las fotos y contraseñas comprobadas por el test de perfil.
- El Compose real de Hermes no se ha inspeccionado ni modificado. Confirmar su
  archivo/target antes de desplegar; ver SERVER_DEPLOYMENT.md.

## Regresión

Sobre la imagen standalone: sprint 1, sprint 4, muro, gamificación, funcional por
roles, concurrencia, eliminación de usuarios y perfil aprobados. Se validaron
ambos archivos Compose. No se repitió la construcción desde SMB en esta revisión.

Vista de revisión: http://localhost:3003, contraseña administrativa del README.
Google está deshabilitado hasta configurar un cliente válido. La instancia con
valores ficticios usada para revisar el botón se detuvo al terminar las pruebas.
Los contenedores anteriores de los puertos 3000, 3001 y 3002 se conservan.
