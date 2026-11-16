# Tezcat Workflow

## Abrir la aplicación con Docker

Con Docker iniciado en modo **contenedores Linux** y **Docker Compose v2**, abre
una terminal en la carpeta del proyecto donde está `docker-compose.yml`. Puede
ser una carpeta local o una carpeta SMB a la que tengas acceso de lectura.
Necesitas internet para la primera construcción.

Copia y ejecuta este bloque, igual en PowerShell, Linux o macOS:

```text
docker compose -p workflow-unico up -d --build --no-recreate
docker compose -p workflow-unico exec -T app node docker/universidad/access.mjs
```

Si el primer comando falla, resuelve el error antes de ejecutar el segundo.
Cuando el segundo muestre que la aplicación está lista, abre **http://localhost:3000**.
Verás la landing; pulsa **Iniciar sesión** y utiliza estas credenciales:

| Servicio | Usuario | Contraseña |
| --- | --- | --- |
| Aplicación (administrador) | `admin@utslp.com` | `Pass123456` |
| PostgreSQL (base `workflow`) | `admin@utslp.com` | `Pass123456` |

Son credenciales de demostración para la evaluación académica y se crean en
instalaciones nuevas. No se restablecen contraseñas de cuentas existentes.

Se ejecuta **un solo contenedor** con la web, el backend y PostgreSQL 16.
Las migraciones y la creación del administrador son automáticas. No necesitas
configurar `.env` ni instalar Node, pnpm, Python o PostgreSQL en tu equipo.
El puerto 3000 debe estar disponible; PostgreSQL no publica su puerto.

## Carpeta SMB y datos persistentes

Docker lee el proyecto desde SMB únicamente para construir la imagen. La
aplicación se ejecuta dentro del contenedor y no necesita la carpeta compartida
una vez construida. No instala dependencias ni ejecuta la base de datos sobre SMB.

La base, los adjuntos, las fotos y las credenciales se guardan automáticamente en
el volumen local de Docker **`workflow_data`**. Se conservan al recrear el
contenedor con ese mismo volumen. No elimines el volumen ni uses `down -v`.
Para acceder desde otro equipo, abre `http://IP_DEL_EQUIPO:3000` si su firewall
permite la conexión.

Se probó construir desde una carpeta SMB de una VM y ejecutar en Docker Desktop
para Windows con Linux amd64. ARM64, macOS y otras configuraciones SMB no se han
validado. La [evidencia de SMB](docker/universidad/FASE7_ENTREGA.md) indica la
versión probada; los cambios posteriores se documentan en sus informes.

## Volver a abrir o actualizar

Repetir el bloque inicial reutiliza el contenedor existente y conserva los datos.
**`--no-recreate` no actualiza un contenedor anterior**, aunque el código del
repositorio haya cambiado. Los cambios del proyecto requieren reconstruir la
imagen y recrear el contenedor para aplicarse.

Para instalar una versión nueva con datos existentes, sigue la
[guía de actualización con volumen](DOCKER_DEPLOYMENT.md#actualizar-o-recrear-una-instalación-con-volumen)
y realiza primero un [respaldo](BACKUP_RECOVERY.md). Si tu instalación anterior
no tiene volumen, consulta esa guía antes de recrearla.

Docker mantiene el mismo método de construcción desde SMB cuando cambia el
proyecto, siempre que el código, las dependencias y las migraciones sigan siendo
compatibles con la imagen. Los cambios también necesitan compilarse y probarse.

## Funciones

- Landing pública, acceso por roles y gestión de tareas, muro, revisiones,
  adjuntos, notificaciones y recompensas.
- Administración de usuarios, departamentos, etiquetas y auditoría.
  La eliminación de cuentas requiere confirmar el correo y resolver primero
  sus tareas o canjes pendientes; conserva el historial.
- En Perfil, encargados y miembros pueden subir o quitar su foto y cambiar su
  contraseña indicando la actual. El cambio cierra todas sus sesiones.
  ADMIN no tiene esos ajustes. **Solo ADMIN puede cambiar nombres desde Usuarios.**
- Fotos JPG, PNG o WebP sin animación, hasta 2 MB y 16 megapíxeles, incluidas
  en el volumen persistente y en los respaldos.

## Documentación

- [Guía Docker y solución de problemas](DOCKER_DEPLOYMENT.md).
- [Entrega portable sin código fuente ni compilación](docker/portable/LEEME.md).
- [Respaldos y recuperación](BACKUP_RECOVERY.md).
- [Pruebas funcionales por roles](FUNCTIONAL_VALIDATION.md),
  [correcciones y pantallas](FIXES_VALIDATION.md) y
  [perfil y landing](PROFILE_VALIDATION.md).
- [Contribución y desarrollo](CONTRIBUTING.md).
