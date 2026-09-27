# Guía de Contribución — Tezcat Workflow

Gracias por contribuir a **Tezcat Workflow**.

Esta guía explica las reglas básicas para trabajar en el proyecto y algunos comandos necesarios para realizar las acciones más comunes.

---

## 1. Obtener el proyecto

Para trabajar por primera vez en Workflow, clona el repositorio:

```bash id="g1"
git clone URL_DEL_REPOSITORIO
```

Después entra a la carpeta:

```bash id="g2"
cd workflow
```

Instala las dependencias:

```bash id="g3"
corepack pnpm install
```

Este proyecto utiliza **pnpm**. Corepack viene incluido con las versiones modernas de Node.js y permite ejecutar la versión adecuada de pnpm sin instalarla globalmente.

Inicia el proyecto en modo desarrollo:

```bash id="g4"
corepack pnpm dev
```

---

## 2. Antes de comenzar a trabajar

Antes de realizar cambios, descarga la versión más reciente del proyecto:

```bash id="g5"
git pull
```

Esto ayuda a evitar trabajar sobre una versión desactualizada.

También puedes comprobar el estado actual del repositorio:

```bash id="g6"
git status
```

Ejemplo:

```text id="g7"
On branch main
Your branch is up to date with 'origin/main'.
```

---

## 3. Revisar tus cambios

Mientras trabajas puedes utilizar:

```bash id="g8"
git status
```

para ver qué archivos modificaste.

Para ver exactamente qué cambió:

```bash id="g9"
git diff
```

Ejemplo:

```text id="g10"
modified: src/routes/tasks/+page.svelte
modified: src/lib/components/TaskCard.svelte
```

---

## 4. Preparar cambios para un commit

Cuando hayas terminado una parte del trabajo puedes preparar los archivos modificados.

Para agregar todos los cambios:

```bash id="g11"
git add .
```

También puedes agregar únicamente un archivo:

```bash id="g12"
git add src/lib/components/TaskCard.svelte
```

Después puedes comprobar qué archivos están preparados:

```bash id="g13"
git status
```

---

## 5. Commits

Un commit guarda un punto específico del trabajo realizado.

Los commits deben tener mensajes claros que indiquen qué se hizo.

Utilizamos el formato:

```text id="g14"
tipo: descripción
```

### Nueva funcionalidad

Utiliza `feat`:

```bash id="g15"
git commit -m "feat: add task creation form"
```

### Corrección de errores

Utiliza `fix`:

```bash id="g16"
git commit -m "fix: prevent tasks without deadline"
```

### Cambios visuales

Utiliza `style`:

```bash id="g17"
git commit -m "style: improve sidebar layout"
```

### Documentación

Utiliza `docs`:

```bash id="g18"
git commit -m "docs: update installation instructions"
```

### Refactorización

Utiliza `refactor`:

```bash id="g19"
git commit -m "refactor: simplify task service"
```

### Pruebas

Utiliza `test`:

```bash id="g20"
git commit -m "test: add task creation tests"
```

### Mantenimiento

Utiliza `chore`:

```bash id="g21"
git commit -m "chore: update dependencies"
```

Procura que cada commit represente un cambio concreto.

Por ejemplo, es preferible:

```text id="g22"
feat: add task deadline selector
feat: add task priority selector
fix: validate empty task title
```

en lugar de:

```text id="g23"
changes
```

o:

```text id="g24"
stuff fixed
```

---

## 6. Subir los cambios

Después de crear uno o varios commits, súbelos al repositorio:

```bash id="g25"
git push
```

El flujo básico sería:

```bash id="g26"
git status
git add .
git commit -m "feat: add task creation form"
git push
```

---

## 7. Actualizar el proyecto

Antes de comenzar una nueva sesión de trabajo, actualiza tu copia local:

```bash id="g27"
git pull
```

Un flujo cotidiano puede ser:

```bash id="g28"
git pull

# Trabajar en el proyecto...

git status
git add .
git commit -m "feat: add user profile"
git push
```

---

## 8. Crear una rama

No trabajes directamente sobre `main`. Crea una rama para cada funcionalidad, corrección o cambio de documentación.

Primero cambia a `main` y descarga su versión más reciente:

```bash id="g29"
git switch main
git pull origin main
```

Después crea la rama:

```bash id="g30"
git switch -c tipo/nombre-de-la-rama
```

Por ejemplo:

```bash id="g31"
git switch -c feature/task-system
```

Utiliza nombres cortos, descriptivos y sin espacios. Algunos prefijos recomendados son:

```text
feature/nueva-funcionalidad
fix/correccion-de-error
docs/actualizar-guia
```

Para comprobar en qué rama estás:

```bash id="g32"
git branch
```

Ejemplo:

```text id="g33"
  main
* task-system
```

El `*` indica la rama actual.

---

## 9. Cambiar de rama

Para regresar a otra rama:

```bash id="g34"
git switch main
```

Para cambiar a una rama existente:

```bash id="g36"
git switch feature/task-system
```

---

## 10. Subir una rama nueva

La primera vez que subas una rama:

```bash id="g37"
git push -u origin feature/task-system
```

Después de eso normalmente bastará con:

```bash id="g38"
git push
```

---

## 11. Pull Requests

Cuando termines un cambio realizado en una rama:

1. Asegúrate de haber creado tus commits.
2. Sube la rama a GitHub.
3. Abre el repositorio en GitHub.
4. Selecciona **Pull requests**.
5. Selecciona **New pull request**.
6. Selecciona tu rama.
7. Describe los cambios realizados.
8. Crea el Pull Request.

Por ejemplo:

```text id="g39"
Título:

feat: add task creation system

Descripción:

## Cambios

- Se agregó el formulario de tareas.
- Se agregó la fecha límite.
- Se agregó la selección de responsable.

## Cómo probar

1. Abrir un proyecto.
2. Seleccionar "Nueva tarea".
3. Completar el formulario.
4. Crear la tarea.
5. Comprobar que aparezca correctamente.
```

Si realizaste cambios visuales, agrega capturas de pantalla.

---

## 12. Actualizar una rama

Si el proyecto recibió cambios mientras trabajabas, primero guarda tus cambios con un commit.

Después puedes actualizar la rama principal:

```bash id="g40"
git switch main
git pull origin main
```

Regresa a tu rama:

```bash id="g41"
git switch feature/task-system
```

Y trae los cambios:

```bash id="g42"
git merge main
```

Si Git no encuentra conflictos, realizará el merge automáticamente.

---

## 13. Resolver conflictos

Un conflicto puede ocurrir cuando dos personas modifican la misma parte de un archivo.

Git puede mostrar algo parecido a:

```text id="g43"
<<<<<<< HEAD
Código de tu rama
=======
Código de la otra versión
>>>>>>> main
```

Debes decidir cómo debe quedar el código final y eliminar los marcadores:

```text id="g44"
<<<<<<<
=======
>>>>>>>
```

Después:

```bash id="g45"
git add .
git commit -m "fix: resolve merge conflicts"
```

Nunca elimines código de otro integrante sin comprobar primero para qué sirve.

---

## 14. Deshacer cambios locales

Si modificaste un archivo pero quieres descartar esos cambios:

```bash id="g46"
git restore archivo
```

Ejemplo:

```bash id="g47"
git restore src/lib/components/TaskCard.svelte
```

⚠️ Esto elimina los cambios locales que todavía no hayas guardado en un commit.

Para quitar un archivo del área de preparación después de `git add`:

```bash id="g48"
git restore --staged archivo
```

Ejemplo:

```bash id="g49"
git restore --staged src/lib/components/TaskCard.svelte
```

El archivo seguirá modificado, pero ya no estará preparado para el siguiente commit.

---

## 15. Ver el historial

Para consultar los commits:

```bash id="g50"
git log
```

Para una versión más compacta:

```bash id="g51"
git log --oneline
```

Ejemplo:

```text id="g52"
a83f712 feat: add task creation form
74bc120 fix: validate task deadline
1ab3902 style: improve sidebar
```

---

## 16. Código

Para mantener consistencia en Workflow:

- Utiliza nombres descriptivos.
- Evita duplicar código innecesariamente.
- Reutiliza componentes cuando sea posible.
- Mantén los componentes organizados.
- Utiliza TypeScript correctamente.
- Evita `any` salvo que sea necesario.
- Elimina código que ya no se utilice.
- No dejes código comentado sin una razón.
- Elimina `console.log` utilizados únicamente para depuración.

Ejemplo:

Evita:

```ts id="g53"
let x = getUser();
```

Prefiere:

```ts id="g54"
const currentUser = getUser();
```

---

## 17. Seguridad

Nunca subas información sensible al repositorio.

Esto incluye:

```text id="g55"
Contraseñas
API Keys
Access Tokens
Credenciales
Claves privadas
Secrets
```

No subas:

```text id="g56"
.env
.env.local
```

Estos archivos deben estar incluidos en `.gitignore`.

Ejemplo:

```gitignore id="g57"
.env
.env.local
```

Para documentar las variables necesarias utiliza:

```text id="g58"
.env.example
```

Por ejemplo:

```text id="g59"
DATABASE_URL=
JWT_SECRET=
API_KEY=
```

Nunca coloques valores reales en `.env.example`.

---

## 18. Dependencias

Para instalar una dependencia:

```bash id="g60"
corepack pnpm add nombre-paquete
```

Ejemplo:

```bash id="g61"
corepack pnpm add zod
```

Antes de agregar una dependencia considera si realmente es necesaria.

Cuando agregues una dependencia, asegúrate de subir también los cambios correspondientes en:

```text id="g62"
package.json
pnpm-lock.yaml
```

Ejemplo de commit:

```bash id="g63"
git add package.json pnpm-lock.yaml
git commit -m "chore: add zod dependency"
```

---

## 19. Antes de subir cambios

Comprueba:

- [ ] El proyecto inicia correctamente.
- [ ] El cambio funciona.
- [ ] No rompí funcionalidades existentes.
- [ ] No incluí información sensible.
- [ ] No dejé archivos innecesarios.
- [ ] Eliminé logs de depuración.
- [ ] Mis commits describen correctamente los cambios.
- [ ] El código mantiene el estilo del proyecto.

Puedes comprobar el estado final con:

```bash id="g64"
git status
```

---

## 20. Flujo rápido

Para el trabajo cotidiano:

```bash id="g65"
# Obtener cambios recientes
git pull

# Revisar estado
git status

# Trabajar...

# Revisar los cambios
git diff

# Preparar cambios
git add .

# Crear commit
git commit -m "feat: add task creation form"

# Subir cambios
git push
```

Si estás trabajando en una rama nueva:

```bash id="g66"
git switch main
git pull origin main
git switch -c feature/task-system

# Trabajar...

git add .
git commit -m "feat: add task creation system"

git push -u origin feature/task-system
```

---

## ¿Necesitas ayuda?

Si no estás seguro de qué comando utilizar, si aparece un conflicto o si una acción puede eliminar trabajo existente, pregunta al equipo antes de continuar.

Es mejor preguntar antes de ejecutar un comando destructivo.

---

**Tezcat Group — Workflow**
