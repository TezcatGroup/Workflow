# Validación de la modalidad universitaria

Ejecutada el 6 de noviembre de 2026 en Docker Desktop, motor Linux amd64.

## Resultados comprobados

| Comprobación | Resultado |
| --- | --- |
| Svelte Check | 0 errores y 0 advertencias |
| Compilación local original | Correcta |
| Construcción `workflow:universidad` | Correcta; Node 22 y PostgreSQL 16.15 |
| Arranque limpio | Crea PostgreSQL, ocho migraciones y administrador sin `.env` |
| Cuenta inicial predeterminada | Login correcto con `admin@universidad.local` |
| Cuenta inicial personalizada | Login correcto con `profesor@universidad.local` usando variables de entorno |
| Healthcheck | `healthy`; consulta PostgreSQL y HTTP |
| Montajes y conectividad | `Mounts=[]`; prueba funcional con `--network none` |
| Prueba universitaria incluida | Login, permisos, altas, proyecto, tarea, checklist, revisión, adjunto y fuentes locales: aprobados |
| Reinicio | Conserva usuarios, tarea terminada, archivo y hash del administrador; no duplica migraciones |
| Suite existente `verify-sprint1.ts` | 8/8 aprobadas |
| Suite existente `verify-muro.ts` | Aprobada: etiquetas, aislamiento, concurrencia, conversión y recompensas |
| Fallo de PostgreSQL | Al matar el proceso, el supervisor detiene Node y el contenedor sale con código 1 |
| Fallo de Node | El supervisor detiene PostgreSQL y el contenedor sale con código 1 |
| SIGINT | Apagado ordenado con código 0, sin OOM |
| Recuperación después del fallo | Reinicia y vuelve a pasar la comprobación de persistencia |
| Migración inválida deliberada | Un contenedor nuevo sale con código 1, no levanta Node y detiene PostgreSQL |
| Compose original aislado | Construye; migrador sale con 0; login y panel de administración correctos |
| Cookies del despliegue original | Conservan `Secure` por defecto |
| Archivos y dependencias | Sin `/app/.env` ni dependencia de `tsx` en la imagen final |

La suite de pruebas existente se empaquetó temporalmente con esbuild y se copió
al contenedor de prueba para ejecutarla contra su PostgreSQL interno. No se expuso
5432 ni se utilizaron bind mounts. Los paquetes de desarrollo no se incorporaron
a la imagen final. La nueva prueba `verify.mjs` sí viene incluida y no necesita
herramientas de desarrollo.

## Limitación encontrada en una prueba existente

`verify-sprint4.ts` pasa TC-09 a TC-13 y falla en TC-14 al intentar enviar una tarea
a revisión sin marcar sus criterios. El código actual exige completar el checklist
y devuelve 400; la prueba antigua espera 200. También contiene pasos posteriores
de revisión que no reflejan las validaciones actuales. No se cambiaron esas reglas
ni el script existente para hacer pasar la prueba.

La prueba nueva ejercita las reglas actuales: confirma el rechazo sin checklist,
marca el criterio como miembro, envía a revisión, verifica como encargado y aprueba.
No se declara aprobada la suite completa de sprint 4.

## Alcance y límites

- Verificación funcional HTTP y SQL, no una inspección visual completa en navegador.
- No se probaron todas las pantallas, todas las operaciones ni otras arquitecturas.
- El proyecto no implementa WebSockets; no hay un servicio adicional que arrancar.
- Tamaño observado de la imagen: aproximadamente 855 MB sin comprimir.
- En reposo después de las pruebas: aproximadamente 169 MiB y 0,04 % CPU según
  `docker stats`; son observaciones locales, no pruebas de carga ni garantías.
- El despliegue Compose de compatibilidad utilizó un nombre de proyecto y volumen
  nuevos, sin modificar las instancias o datos que ya existían.
- Los datos se conservan al reiniciar el contenedor; no se garantiza su conservación
  si se elimina y recrea.
