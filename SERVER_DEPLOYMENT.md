# Despliegue administrado con PostgreSQL externo

Esta guía es para el servidor que ya tiene su propia base y un servicio de
migraciones. El README sigue usando un único contenedor y no requiere estos pasos.

## Corrección de empaquetado

`.dockerignore` excluía `drizzle.config.ts` y `scripts/bootstrap-admin.ts`, también
para la etapa `build`. Ambos archivos están ahora incluidos explícitamente.
`pnpm db:migrate` usa `drizzle-kit migrate --config=drizzle.config.ts`.

El Dockerfile ofrece estos targets:

| Target | Uso |
| --- | --- |
| `standalone` (predeterminado) | Web y PostgreSQL integrados; arranque automático del README |
| `external` | Web con DATABASE_URL externo, configuración y herramientas para migración/bootstrap |
| `build` | Construcción y herramientas, también incluye config/bootstrap |

Para la arquitectura de base separada, construye una misma imagen para web y
migraciones a partir del mismo commit:

```text
docker build --target external -t workflow:external .
```

En el Compose administrado por Hermes, configura `build.target: external` en los
servicios que construyan esta imagen. El servicio web ejecuta `node build` (CMD
predeterminado), recibe su DATABASE_URL existente y monta su volumen actual de
adjuntos en `/app/uploads`. La base y sus credenciales se conservan.

El servicio de migraciones usa esa misma imagen, con su red y DATABASE_URL
existentes, y el siguiente comando:

```yaml
command: ["sh", "-c", "pnpm db:migrate && pnpm db:bootstrap"]
```

ADMIN_EMAIL y ADMIN_PASSWORD deben ser los valores administrados por el servidor,
no las credenciales académicas del README. El bootstrap requiere una contraseña
de al menos 12 caracteres y, si la cuenta existe, no cambia nombre, contraseña,
rol ni estado. No montes scripts o configuraciones temporales del anfitrión: los
archivos incluidos en la imagen deben corresponder a sus migraciones.

La web debe arrancar después de que la migración termine correctamente. Para
HTTPS, configura ORIGIN y las cookies como explica [Google Login](GOOGLE_LOGIN.md).
Google es opcional; DATABASE_URL externo no lo es en este target.

No sustituyas el Compose de producción por el del README: representan dos
arquitecturas diferentes. No se ha inspeccionado ni modificado el Compose real
de Hermes; deberá confirmar qué archivo y target utiliza antes de actualizar.
