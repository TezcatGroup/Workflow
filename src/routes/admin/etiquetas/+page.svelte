<script lang="ts">
  import { enhance } from '$app/forms';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Etiqueta = {
    id: string;
    nombre: string;
    categoria: string;
    departamentoId: string;
    activo: boolean;
  };

  // Misma identidad visual que los chips del Muro (TW-14).
  const emojiPorCategoria: Record<string, string> = {
    'LENGUAJE DE PROGRAMACIÓN': '🖥️',
    FRAMEWORK: '🧩'
  };
  const claseChipPorCategoria: Record<string, string> = {
    'LENGUAJE DE PROGRAMACIÓN': 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    FRAMEWORK: 'border-purple-400/40 bg-purple-400/10 text-purple-300'
  };

  const claseEtiqueta =
    'mb-1.5 block font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';

  const campo =
    'block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 pr-3.5 pl-3.5 font-sans text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card';

  // Copia local: mientras la tabla de etiquetas no exista (pendiente del
  // contrato del Sprint 7) la BD no guarda nada; reflejamos aquí lo que
  // devuelven las acciones para que la pantalla se comporte como un CRUD real.
  let etiquetas = $state<Etiqueta[]>([...data.etiquetas]);
  let creando = $state(false);

  const nombreDepartamento = (id: string) =>
    data.departamentos.find((d) => d.id === id)?.nombre ?? 'Sin departamento';
</script>

<svelte:head><title>Etiquetas | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.admin} />
  <main class="mx-auto max-w-4xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-6">
      <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
        TW-14 · Catálogo del Muro
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Etiquetas</h1>
      <p class="mt-1.5 max-w-2xl text-xs text-tezcat-textSecondary">
        Crea las etiquetas por departamento que los encargados asignarán a las tareas opcionales.
        La categoría define el emoji y el color con el que se muestran en el Muro.
      </p>
    </div>

    <!-- Avisos -->
    {#if form?.error}
      <div
        role="alert"
        class="mb-5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300"
      >
        {form.error}
      </div>
    {/if}
    {#if form?.ok}
      <div
        role="status"
        class="mb-5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs text-emerald-300"
      >
        {form.ok}
      </div>
    {/if}

    <!-- Formulario de creación -->
    <form
      method="POST"
      action="?/crear"
      class="mb-8 rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-2xl backdrop-blur-md"
      use:enhance={() => {
        creando = true;
        return async ({ result, update }) => {
          if (result.type === 'success') {
            const recibida = (result.data as { etiqueta?: Etiqueta } | undefined)?.etiqueta;
            if (recibida && !etiquetas.some((e) => e.id === recibida.id)) {
              etiquetas = [...etiquetas, recibida];
            }
          }
          creando = false;
          await update();
        };
      }}
    >
      <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
        Nueva etiqueta
      </p>

      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class={claseEtiqueta} for="nombre">Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            maxlength="60"
            required
            placeholder="Ej. Python, Svelte, SQL…"
            class={campo}
          />
        </div>

        <div>
          <label class={claseEtiqueta} for="categoria">Categoría *</label>
          <select id="categoria" name="categoria" required class={campo}>
            <option value="LENGUAJE DE PROGRAMACIÓN">🖥️ Lenguaje de programación</option>
            <option value="FRAMEWORK">🧩 Framework</option>
          </select>
        </div>

        <div>
          <label class={claseEtiqueta} for="departamentoId">Departamento *</label>
          <select id="departamentoId" name="departamentoId" required class={campo}>
            <option value="">Selecciona…</option>
            {#each data.departamentos as d (d.id)}
              <option value={d.id}>{d.nombre}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={creando}
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-5 py-2.5 text-sm font-bold tracking-wide text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 focus:ring-2 focus:ring-tezcat-cyan/60 focus:outline-none active:scale-[0.99] disabled:opacity-70"
        >
          {#if creando}
            <span
              class="size-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
              aria-hidden="true"
            ></span>
            <span>Creando…</span>
          {:else}
            <span>Crear etiqueta</span>
          {/if}
        </button>
      </div>
    </form>

    <!-- Listado -->
    {#if etiquetas.length > 0}
      <p class="mb-3 font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
        {etiquetas.length} etiqueta{etiquetas.length === 1 ? '' : 's'}
      </p>
      <div class="grid gap-3">
        {#each etiquetas as et (et.id)}
          <form
            method="POST"
            action="?/actualizar"
            class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 shadow-xl backdrop-blur-md"
            use:enhance={() => {
              return async ({ result, update }) => {
                if (result.type === 'success') {
                  const recibida = (result.data as { etiqueta?: Etiqueta } | undefined)?.etiqueta;
                  if (recibida) {
                    etiquetas = etiquetas.map((e) => (e.id === recibida.id ? recibida : e));
                  }
                }
                await update();
              };
            }}
          >
            <input type="hidden" name="id" value={et.id} />
            <input type="hidden" name="departamentoId" value={et.departamentoId} />

            <!-- Fila informativa -->
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold {claseChipPorCategoria[et.categoria] ?? ''}"
              >
                <span aria-hidden="true">{emojiPorCategoria[et.categoria] ?? '🏷️'}</span>
                {et.nombre}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full border border-tezcat-border bg-tezcat-bg px-2.5 py-1 font-mono text-[10px] text-tezcat-textSecondary"
              >
                {nombreDepartamento(et.departamentoId)}
              </span>
              {#if !et.activo}
                <span
                  class="rounded-full border border-tezcat-danger/40 bg-tezcat-danger/10 px-2.5 py-1 font-mono text-[10px] text-red-300"
                >
                  Inactiva
                </span>
              {/if}
            </div>

            <!-- Edición en línea (patrón de Departamentos) -->
            <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <div>
                <label class={claseEtiqueta} for="nombre-{et.id}">Nombre</label>
                <input
                  id="nombre-{et.id}"
                  name="nombre"
                  maxlength="60"
                  required
                  value={et.nombre}
                  class={campo}
                />
              </div>
              <div>
                <label class={claseEtiqueta} for="categoria-{et.id}">Categoría</label>
                <select id="categoria-{et.id}" name="categoria" class={campo} value={et.categoria}>
                  <option value="LENGUAJE DE PROGRAMACIÓN">🖥️ Lenguaje</option>
                  <option value="FRAMEWORK">🧩 Framework</option>
                </select>
              </div>
              <div>
                <label class={claseEtiqueta} for="activo-{et.id}">Estado</label>
                <select id="activo-{et.id}" name="activo" class={campo} value={String(et.activo)}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
              <button
                type="submit"
                class="inline-flex h-[42px] items-center justify-center rounded-xl border border-tezcat-border px-4 text-xs font-semibold text-tezcat-textSecondary transition-colors hover:border-tezcat-borderHighlight hover:text-tezcat-textPrimary"
              >
                Guardar
              </button>
            </div>
          </form>
        {/each}
      </div>
    {:else}
      <div class="rounded-2xl border border-dashed border-tezcat-border p-12 text-center">
        <span class="text-4xl" aria-hidden="true">🏷️</span>
        <p class="mt-3 text-sm font-bold text-tezcat-textPrimary">Aún no hay etiquetas</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-tezcat-textSecondary">
          Crea la primera con el formulario de arriba: los encargados la usarán para etiquetar las
          tareas opcionales del Muro.
        </p>
      </div>
    {/if}
  </main>
</div>