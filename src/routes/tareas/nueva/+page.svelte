<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // VISTA PROVISIONAL (backend): funcional pero sin diseño final. El frontend puede reemplazarla
  // completa; el contrato de datos y de campos está en +page.server.ts.
  const campo = 'w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2 text-sm text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card';
  const etiqueta = 'mb-1 block font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';

  const v = $derived(form?.valores);
  // Los criterios se cargan una sola vez con lo que la persona escribió si hubo un error.
  let criterios = $state<string[]>(
    untrack(() => (form?.valores?.criterios?.length ? [...form.valores.criterios] : ['']))
  );
  const hoy = new Date().toISOString().slice(0, 10);
</script>

<svelte:head><title>Nueva tarea | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
    <Panel titulo="Nueva tarea obligatoria" descripcion="Las tareas obligatorias no otorgan XP, puntos ni ramas.">
      {#if form?.error}
        <p role="alert" class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{form.error}</p>
      {/if}

      <form method="POST" action="?/crear" use:enhance class="space-y-4">
        <label class="block">
          <span class={etiqueta}>Título *</span>
          <input name="titulo" maxlength="200" required value={v?.titulo ?? ''} class={campo} />
        </label>

        <label class="block">
          <span class={etiqueta}>Descripción</span>
          <textarea name="descripcion" rows="4" maxlength="5000" class={campo}>{v?.descripcion ?? ''}</textarea>
        </label>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class={etiqueta}>Responsable *</span>
            <select name="responsableId" required class={campo}>
              <option value="">Selecciona…</option>
              {#each data.responsables as r (r.id)}
                <option value={r.id} selected={v?.responsableId === r.id}>{r.nombre}</option>
              {/each}
            </select>
          </label>

          <label class="block">
            <span class={etiqueta}>Revisor</span>
            <select name="revisorId" class={campo}>
              <option value="">Yo (por defecto)</option>
              {#each data.responsables as r (r.id)}
                <option value={r.id} selected={v?.revisorId === r.id}>{r.nombre}</option>
              {/each}
            </select>
          </label>

          <label class="block">
            <span class={etiqueta}>Fecha límite *</span>
            <input type="date" name="fechaLimite" min={hoy} required value={v?.fechaLimite ?? ''} class={campo} />
          </label>

          <label class="block">
            <span class={etiqueta}>Proyecto</span>
            <select name="proyectoId" class={campo}>
              <option value="">Sin proyecto</option>
              {#each data.proyectos as p (p.id)}
                <option value={p.id} selected={v?.proyectoId === p.id}>{p.nombre}</option>
              {/each}
            </select>
          </label>

          <label class="block">
            <span class={etiqueta}>Prioridad</span>
            <select name="prioridad" class={campo}>
              {#each data.prioridades as p (p)}
                <option value={p} selected={(v?.prioridad || data.prioridadPorDefecto) === p}>{p}</option>
              {/each}
            </select>
          </label>

          <label class="block">
            <span class={etiqueta}>Dificultad</span>
            <select name="dificultad" class={campo}>
              {#each data.dificultades as d (d)}
                <option value={d} selected={(v?.dificultad || data.dificultadPorDefecto) === d}>{d}</option>
              {/each}
            </select>
          </label>
        </div>

        <fieldset class="space-y-2">
          <legend class={etiqueta}>Criterios de aceptación</legend>
          {#each criterios as _, i (i)}
            <div class="flex gap-2">
              <input name="criterios" maxlength="255" bind:value={criterios[i]} class={campo} placeholder="Criterio verificable" />
              <button type="button" class="rounded-lg border border-tezcat-border px-3 text-sm" aria-label="Quitar criterio"
                onclick={() => (criterios = criterios.filter((_, j) => j !== i))}>✕</button>
            </div>
          {/each}
          <button type="button" class="text-sm text-tezcat-cyan" onclick={() => (criterios = [...criterios, ''])}>
            + Agregar criterio
          </button>
        </fieldset>

        <div class="flex justify-end gap-3 pt-2">
          <a href="/tareas" class="rounded-lg border border-tezcat-border px-4 py-2 text-sm">Cancelar</a>
          <button class="rounded-lg border border-tezcat-borderHighlight bg-tezcat-surfaceAlt px-4 py-2 text-sm font-semibold">
            Crear tarea
          </button>
        </div>
      </form>
    </Panel>
  </main>
</div>
