<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Contrato de datos y campos: ver +page.server.ts (propiedad del backend).
  // Esta vista consume data.responsables / data.revisores / data.proyectos / prioridades /
  // dificultades y restaura lo escrito desde form.valores si la creación falló.

  const etiqueta = 'mb-1.5 block font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';

  const campo =
    'block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 pr-3.5 pl-10 font-sans text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card';

  const v = $derived(form?.valores);

  // Los criterios se cargan una sola vez con lo que la persona escribió si hubo un error.
  let criterios = $state<string[]>(
    untrack(() => (form?.valores?.criterios?.length ? [...form.valores.criterios] : ['']))
  );

  const hoy = new Date().toISOString().slice(0, 10);
  let enviando = $state(false);

  function agregarCriterio() {
    criterios = [...criterios, ''];
  }

  function quitarCriterio(i: number) {
    criterios = criterios.length === 1 ? [''] : criterios.filter((_, j) => j !== i);
  }
</script>

<svelte:head><title>Nueva tarea obligatoria | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-3xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-6">
      <a
        href="/tareas"
        class="inline-flex items-center gap-1 text-xs font-semibold text-tezcat-cyan transition-colors hover:text-tezcat-cyanHover"
      >
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Volver a tareas
      </a>
      <p class="mt-4 font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
        TW-04 · Tareas obligatorias
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Nueva tarea obligatoria</h1>
      <p class="mt-1.5 text-xs text-tezcat-textSecondary">
        Define responsable, fecha límite y criterios verificables. Las tareas obligatorias no otorgan XP, puntos ni ramas.
      </p>
    </div>

    <!-- Tarjeta -->
    <div class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      {#if form?.error}
        <div
          role="alert"
          class="mb-5 flex items-start gap-2.5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300"
        >
          <span class="material-symbols-outlined shrink-0 text-base">error</span>
          <span>{form.error}</span>
        </div>
      {/if}

      <form
        method="POST"
        action="?/crear"
        class="space-y-5"
        use:enhance={() => {
          enviando = true;
          return async ({ update }) => {
            enviando = false;
            await update();
          };
        }}
      >
        <!-- Título -->
        <div>
          <label class={etiqueta} for="titulo">Título de la tarea *</label>
          <div class="relative rounded-xl shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg">assignment</span>
            </div>
            <input
              id="titulo"
              name="titulo"
              maxlength="200"
              required
              value={v?.titulo ?? ''}
              placeholder="Ej. Levantar inventario del laboratorio"
              class={campo}
            />
          </div>
        </div>

        <!-- Descripción -->
        <div>
          <label class={etiqueta} for="descripcion">
            Descripción <span class="text-tezcat-textMuted normal-case">(opcional)</span>
          </label>
          <div class="relative rounded-xl shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-start pt-3 pl-3.5 text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg">subject</span>
            </div>
            <textarea
              id="descripcion"
              name="descripcion"
              rows="4"
              maxlength="5000"
              placeholder="Contexto, alcance o instrucciones para el responsable…"
              class="{campo} resize-y">{v?.descripcion ?? ''}</textarea>
          </div>
        </div>

        <!-- Responsable / Revisor -->
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class={etiqueta} for="responsableId">Responsable *</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">person</span>
              </div>
              <select id="responsableId" name="responsableId" required class={campo}>
                <option value="">Selecciona…</option>
                {#each data.responsables as r (r.id)}
                  <option value={r.id} selected={v?.responsableId === r.id}>{r.nombre}</option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label class={etiqueta} for="revisorId">
              Revisor <span class="text-tezcat-textMuted normal-case">(opcional)</span>
            </label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">rate_review</span>
              </div>
              <select id="revisorId" name="revisorId" class={campo}>
                <option value="">Yo (por defecto)</option>
                {#each data.revisores as r (r.id)}
                  <option value={r.id} selected={v?.revisorId === r.id}>{r.nombre}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <!-- Fecha límite / Proyecto -->
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class={etiqueta} for="fechaLimite">Fecha límite *</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">event</span>
              </div>
              <input
                type="date"
                id="fechaLimite"
                name="fechaLimite"
                min={hoy}
                required
                value={v?.fechaLimite ?? ''}
                class="{campo} [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label class={etiqueta} for="proyectoId">
              Proyecto <span class="text-tezcat-textMuted normal-case">(opcional)</span>
            </label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">folder</span>
              </div>
              <select id="proyectoId" name="proyectoId" class={campo}>
                <option value="">Sin proyecto</option>
                {#each data.proyectos as p (p.id)}
                  <option value={p.id} selected={v?.proyectoId === p.id}>{p.nombre}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <!-- Prioridad / Dificultad -->
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class={etiqueta} for="prioridad">Prioridad</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">bolt</span>
              </div>
              <select id="prioridad" name="prioridad" class={campo}>
                {#each data.prioridades as p (p)}
                  <option value={p} selected={(v?.prioridad || data.prioridadPorDefecto) === p}>{p}</option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label class={etiqueta} for="dificultad">Dificultad</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                <span class="material-symbols-outlined text-lg">signal_cellular_alt</span>
              </div>
              <select id="dificultad" name="dificultad" class={campo}>
                {#each data.dificultades as d (d)}
                  <option value={d} selected={(v?.dificultad || data.dificultadPorDefecto) === d}>{d}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <!-- Criterios de aceptación -->
        <fieldset>
          <legend class={etiqueta}>Criterios de aceptación *</legend>
          <p class="mb-2 text-[11px] text-tezcat-textMuted">
            Condiciones verificables que comprueban que la tarea quedó terminada. Agrega al menos una.
          </p>

          <div class="space-y-2.5">
            {#each criterios as _, i (i)}
              <div class="flex items-center gap-2.5">
                <div class="relative flex-1 rounded-xl shadow-sm">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
                    <span class="material-symbols-outlined text-lg">rule</span>
                  </div>
                  <input
                    name="criterios"
                    maxlength="255"
                    bind:value={criterios[i]}
                    placeholder="Ej. Entregar reporte firmado por el encargado"
                    class={campo}
                  />
                </div>
                <button
                  type="button"
                  onclick={() => quitarCriterio(i)}
                  title="Quitar criterio"
                  aria-label="Quitar criterio"
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tezcat-border bg-tezcat-bg text-tezcat-textMuted transition-colors hover:border-tezcat-danger/60 hover:text-red-300 focus:outline-none"
                >
                  <span class="material-symbols-outlined text-lg">remove</span>
                </button>
              </div>
            {/each}
          </div>

          <button
            type="button"
            onclick={agregarCriterio}
            class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-tezcat-cyan transition-colors hover:text-tezcat-cyanHover"
          >
            <span class="material-symbols-outlined text-base">add</span>
            Agregar criterio
          </button>
        </fieldset>

        <!-- Acciones -->
        <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <a
            href="/tareas"
            class="inline-flex items-center justify-center rounded-xl border border-tezcat-border px-4 py-3 text-sm font-semibold text-tezcat-textSecondary transition-colors hover:border-tezcat-borderHighlight hover:text-tezcat-textPrimary"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={enviando}
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-5 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 focus:ring-2 focus:ring-tezcat-cyan/60 focus:outline-none active:scale-[0.99] disabled:opacity-70"
          >
            {#if enviando}
              <span class="material-symbols-outlined animate-spin text-lg">refresh</span>
              <span>Creando…</span>
            {:else}
              <span>Crear tarea obligatoria</span>
              <span class="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>