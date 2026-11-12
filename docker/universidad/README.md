# Modalidad universitaria

El despliegue de un único contenedor ahora es el predeterminado del repositorio.
Consulta [el inicio automático sin configuración](../../DOCKER_DEPLOYMENT.md).

`docker build -f docker/universidad/Dockerfile -t workflow:universidad .` sigue
siendo compatible. Su Dockerfile debe mantenerse idéntico al de la raíz.
La imagen genera credenciales únicas; `access.mjs` muestra los datos de acceso.

[VALIDACION.md](VALIDACION.md) describe pruebas históricas del 6 de noviembre.
La revisión actual tiene su informe en [FASE2_VALIDACION.md](FASE2_VALIDACION.md).
