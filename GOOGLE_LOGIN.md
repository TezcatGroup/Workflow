# Inicio de sesión con Google

Workflow mantiene **dos opciones**: correo/contraseña y Google. Google no registra
usuarios nuevos: el administrador debe crear primero la cuenta con ese mismo
correo. La cuenta debe seguir activa y sin bloqueo temporal. El rol, el nombre,
la contraseña y el departamento existentes se conservan.

## 1. Crear el cliente en Google Cloud

1. Abre [Google Cloud Console](https://console.cloud.google.com/) y selecciona
   o crea un proyecto para Workflow.
2. En **Google Auth Platform**, configura **Branding** con el nombre de la app,
   correo de soporte y contacto. En **Audience**, elige la audiencia que
   corresponda. Si usas el modo de prueba, añade los correos de prueba.
3. En **Clients**, crea un cliente OAuth de tipo **Web application**.
4. En **Authorized redirect URIs**, registra exactamente las direcciones que
   usarás (ruta, esquema y puerto deben coincidir):

   ```text
   http://localhost:3000/login/google/callback
   https://workflow.tezcatgroup.com/login/google/callback
   ```

   Para la instancia de revisión local en el puerto 3003, registra además
   `http://localhost:3003/login/google/callback` y usa esa URL en su configuración.
   Una IP de la LAN por HTTP no equivale a localhost; para acceso remoto usa HTTPS.
5. Guarda el **Client ID** y el **Client secret**. No los incluyas en Git ni en
   capturas o mensajes. La aplicación solicita solamente `openid email`.

Referencia oficial: [OpenID Connect de Google](https://developers.google.com/identity/openid-connect/openid-connect).

## 2. Configurar Docker una vez

Para el contenedor único del repositorio, crea un archivo local `.env` junto a
`docker-compose.yml`, con estos valores del cliente recién creado:

```dotenv
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback
```

`.env` está excluido de Git y de la imagen. Compose pasa estas variables al
contenedor; no necesitas configurar DATABASE_URL en el despliegue único.
El acceso con contraseña funciona también sin este archivo.

Para el dominio HTTPS, usa en el entorno del servidor:

```dotenv
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://workflow.tezcatgroup.com/login/google/callback
ORIGIN=https://workflow.tezcatgroup.com
WORKFLOW_LOCAL_HTTP=false
```

Si Hermes usa su propio Compose, debe pasar estas variables a su servicio web.
No basta con ponerlas en `.env` si ese Compose no las referencia. En producción
la aplicación debe publicarse detrás del proxy HTTPS del dominio.

Las variables se leen al arrancar; aplicar cambios a un contenedor existente
requiere recrearlo. Primero sigue la [guía de respaldo](BACKUP_RECOVERY.md) y
comprueba que se conserva el volumen correcto. Para la instalación del README
que ya usa `workflow_data`:

```text
docker compose -p workflow-unico up -d --build --force-recreate app
```

No uses este comando sobre una instalación antigua sin volumen. No modifica
las cuentas ni cambia sus contraseñas. El comando inicial del README utiliza
`--no-recreate`, por lo que repetirlo no aplica esta configuración a un contenedor
que ya estaba creado.

## 3. Probar las dos opciones

1. En Usuarios, el administrador crea una cuenta con un correo real de Gmail o
   Google Workspace que controles. Una cuenta Google por sí sola no crea la
   cuenta local. `admin@utslp.com` no permite entrar con un correo Google distinto.
2. En la URL configurada, abre `/login`: aparecen correo/contraseña y
   **Continuar con Google**. Elige esa cuenta Google.
3. Debe abrirse el espacio de su rol. Al salir, comprueba que también funciona
   su contraseña de Workflow.
4. Un correo no registrado, una cuenta desactivada o bloqueada deben ser
   rechazados sin crear usuarios. Una cuenta eliminada deja de tener acceso.

Cuando falta configuración o se abre otra dirección, el botón Google aparece
inactivo y el acceso con contraseña sigue disponible. `redirect_uri_mismatch`
indica que la URL configurada no coincide exactamente con la del cliente Google.

## Validación y límites

Se verifican firma, emisor, destinatario, vencimiento y nonce del ID token. El
flujo utiliza state, PKCE y cookie temporal firmada/HttpOnly. Los endpoints de
Google son fijos y el retorno sale de la configuración, no del encabezado Host.
El token y el secreto no se guardan en auditoría ni en la sesión del navegador.
Al primer acceso se asocia el identificador estable `sub` a la cuenta existente;
no se permite asociar otra identidad Google al mismo usuario.

Solo se admite acceso automático por correo verificado de Gmail o Google
Workspace. Google no garantiza la propiedad actual de un correo externo que
se haya asociado a una cuenta Google: para esos correos se conserva el acceso
con contraseña. Véase la [validación oficial del ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Pruebas locales: `pnpm exec tsx scripts/verify-google-oauth.ts` valida tokens
firmados de prueba, estados y configuración. `scripts/verify-google-accounts.ts`
comprueba el servicio de cuentas contra una base aislada (no simula el servidor
de Google). Se prepara con `node scripts/build-google-account-test.mjs SALIDA.mjs`
y requiere `WORKFLOW_TEST_ONLY=1` y DATABASE_URL de pruebas.

La prueba con una cuenta real y los servidores de Google queda pendiente de
crear/configurar el cliente OAuth. No se han creado credenciales ni modificado
la configuración del dominio publicado.
