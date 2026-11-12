# Fase 4: SMB y entrega portable

Validación del 12 de noviembre de 2026, Docker Desktop en Windows, motor Linux amd64.

## Entregables

- DOCKER_DEPLOYMENT.md: método A (construcción leyendo un recurso SMB ya montado)
  y método B (copia local, construcción, exportación, transferencia e importación).
- docker/portable/compose.yaml: solo imagen, pull_policy=never, un servicio y el
  volumen workflow_data. No contiene build ni bind mounts.
- docker/portable/LEEME.md: bloque de inicio para el profesor y alternativa
  docker run. Ambos funcionan sin fuentes ni dependencias en el anfitrión.
- README: acceso directo al procedimiento de entrega sin repositorio.
- .gitignore: excluye TAR para no publicar imágenes o respaldos accidentalmente.

Los comandos usan Docker estándar; no se añade un instalador que requiera Bash,
PowerShell, Python o Node en todas las plataformas. El bloque del profesor se
copia igual en las terminales compatibles de Windows, Linux y macOS.

## Paquete construido y probado

Etiqueta: `workflow:2026.11.12`. Plataforma: `linux/amd64`.

Carpeta local de entrega:
`C:\Users\black\Downloads\workflow-2026.11.12-linux-amd64`

Contiene compose.yaml, LEEME.md, workflow-2026.11.12.tar y SHA256SUMS.txt.
Tamaño del TAR: 216150528 bytes (aproximadamente 216 MB / 206 MiB).

SHA-256 del TAR:

```text
fde43b031f28a4b9425db170f7c69f8874b232c92c777f685682ebdb592003a0
```

ID observado antes y después de importar:

```text
sha256:6f07a8c40fd09d2ade6399096b4a3719d10f8021f90d17925e49e2aa0b7ec12f
```

El TAR no está en Git ni se publicó en un registro. No contiene los datos del
volumen. Estos identificadores describen esta construcción; una reconstrucción
posterior puede cambiar por las imágenes base, paquetes del sistema y fuentes.

## Pruebas realizadas

1. Construcción local con --platform linux/amd64: correcta.
2. docker save a una carpeta nueva fuera del repositorio: correcto.
3. Se conserva una etiqueta de referencia y se retira únicamente la etiqueta
   recién creada workflow:2026.11.12. docker load restaura esa etiqueta y el
   mismo ID. Se reutilizó el mismo motor Docker y sus capas, no otro anfitrión.
4. Desde la carpeta de entrega, con solo los cuatro archivos indicados, Compose
   inicia con --no-build --pull never --no-recreate. Para aislar los datos se
   utiliza el volumen nuevo workflow-phase4-delivery-test-20261112 y proyecto
   workflow-phase4-delivery, sin cambiar archivos de entrega.
5. access.mjs muestra admin@utslp.com / Pass123456 y espera la disponibilidad.
6. verify.mjs: login, permisos, usuarios, departamentos, proyecto, tarea,
   revisión, adjuntos y fuentes locales: aprobado.
7. GET /login desde Windows devuelve 200; healthcheck de PostgreSQL/HTTP pasa.
8. Inspect muestra únicamente el volumen administrado local; no hay montajes
   del repositorio ni SMB.
9. Se desconecta la red Docker del contenedor y se reinicia. access.mjs y
   verify.mjs check pasan; datos, credenciales y adjuntos conservados. Networks={}.
10. El contenedor de prueba queda detenido y su volumen se conserva.
11. Validación de Compose confirma un servicio, sin build ni pull y nombre
    predeterminado workflow_data. git diff --check pasa.

## Pendientes y límites

- Get-SmbMapping no mostró recursos montados. No se probó una lectura real
  sobre SMB ni se reprodujo el error original del profesor. El método A está
  documentado; su viabilidad debe verificarse en ese recurso concreto.
- Exportación e importación se verificaron localmente. No se transfirió el TAR
  por una red física ni se importó en un segundo motor vacío.
- No se probaron ARM64, macOS, Linux nativo ni acceso desde otra máquina de la LAN.
- Las credenciales de demostración son públicas, según lo solicitado.
- Las instalaciones anteriores sin volumen no se migran automáticamente.
- Respaldos/restauración de datos corresponden a la fase 5; no se copió una base
  activa ni se eliminaron datos reales o volúmenes existentes.
