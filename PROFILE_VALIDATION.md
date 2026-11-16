# Perfil: foto y contraseña — revisión r3

Validado el 16 de noviembre de 2026 sobre `workflow:2026.11.16-r3`, Linux amd64,
en Docker Desktop para Windows. Se usaron cuentas y volúmenes de prueba.

## Permisos y comportamiento

| Acción | ADMIN | ENCARGADO / MIEMBRO |
| --- | --- | --- |
| Cambiar nombre | Desde Usuarios | No permitido, tampoco mediante POST directo |
| Cambiar foto propia | No disponible; servidor 403 | Subir, reemplazar y quitar |
| Cambiar contraseña propia | No disponible; servidor 403 | Requiere contraseña actual y confirmación |

El perfil conserva su información de progreso. Solo encargados y miembros ven
Ajustes de perfil. No existe una acción para editar el nombre desde Perfil.
Las acciones de foto y contraseña solo afectan al usuario autenticado; ignoran
campos adicionales de nombre, rol o ID enviados por el cliente.

Las imágenes se decodifican con Sharp y se convierten a WebP de 512 × 512 píxeles,
sin conservar metadatos. Se aceptan JPG, PNG y WebP estáticos, hasta 2 MB y
16 megapíxeles. La foto se sirve únicamente al propietario autenticado, sin
caché compartida. Reemplazarla, quitarla o eliminar la cuenta retira el archivo.

La nueva contraseña admite entre 12 y 128 caracteres, distintos de la actual.
Se conserva Argon2id, se aplica el bloqueo de intentos existentes al comprobar
la contraseña actual y se revocan todas las sesiones tras el cambio. La auditoría
registra las operaciones sin contraseñas ni hashes.

## Pruebas realizadas

- `pnpm check`: cero errores y advertencias. Construcción Docker completada.
- `scripts/verify-profile.mjs`: cuatro grupos aprobados. Permisos por rol,
  nombre editable solo por ADMIN, campos manipulados, formatos válidos,
  archivos vacíos/corruptos/SVG, límites de bytes/píxeles, reemplazo y borrado,
  cambio de contraseña, confirmación, sesiones revocadas y limpieza al borrar cuenta.
- Regresión: sprint 1, sprint 4, muro, gamificación, funcional por roles,
  concurrencia y eliminación de cuentas: todas aprobadas.
- Chromium real con Playwright: carga, error de imagen, quitar foto, contraseña
  incorrecta, cambio correcto y nuevo inicio de sesión en ambos roles;
  ADMIN sin controles. Escritorio 1440 × 1000 y móvil 390 × 844,
  sin desbordamiento horizontal ni errores JavaScript.
- Recreación del contenedor reutilizando el volumen: fotos y nuevas contraseñas
  conservadas. Respaldo en frío y restauración a otro volumen: mismo resultado.
- Actualización de una copia de un volumen anterior: de ocho a nueve migraciones,
  conservando 23 usuarios (nombres, roles y hashes) y 19 tareas con sus estados.
  La columna de foto inicia vacía en cuentas anteriores.

## Repetir la prueba automatizada

Solo en una instancia aislada con datos sintéticos. Copia el script dentro de
un contenedor iniciado con esta versión y ejecuta:

```text
docker cp scripts/verify-profile.mjs CONTENEDOR:/app/verify-profile.mjs
docker exec -e WORKFLOW_TEST_ONLY=1 -e DATABASE_URL=postgresql://admin%40utslp.com:Pass123456@127.0.0.1:5432/workflow -e TEST_BASE_URL=http://localhost:3000 -e ADMIN_EMAIL=admin@utslp.com -e ADMIN_PASSWORD=Pass123456 CONTENEDOR node /app/verify-profile.mjs
```

El script crea cuentas y cambia sus contraseñas. Guarda datos de prueba en el
volumen; no se debe ejecutar sobre una instalación real. Tras recrear o restaurar
ese volumen, copia el script otra vez y añade `check` al último comando para
comprobar persistencia. El estado sintético no forma parte del paquete TAR.

## Persistencia y entrega

La migración `0008_foto_perfil.sql` agrega únicamente una columna nullable.
Las imágenes viven en `uploads/avatars`, dentro del volumen persistente de
Workflow; los respaldos existentes ya incluyen esa carpeta.

La instancia nueva de revisión queda en http://localhost:3002. Las instancias
anteriores de los puertos 3000 y 3001 se conservaron. El paquete portable r3
contiene la imagen y las instrucciones, sin datos ni sesiones de las pruebas.
Se mantienen las credenciales de demostración del README.

Límites: comprobado en Linux amd64 mediante Docker Desktop; no se ejecutó esta
revisión en ARM64 ni macOS. La foto se muestra en el perfil propio; no se añadió
un directorio público de fotos. La prueba SMB anterior se conserva en su informe,
pero no se repitió con esta revisión de perfil.
