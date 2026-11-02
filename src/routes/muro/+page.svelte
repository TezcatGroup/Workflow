<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Categoria = 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';
  type Etiqueta = { nombre: string; categoria: Categoria };
  type Oportunidad = {
    id: string;
    titulo: string;
    descripcion: string;
    encargado: string;
    fechaLimite: string;
    etiquetas: Etiqueta[];
  };

  // La "imagen" de cada etiqueta es un emoji por categoría (decisión del equipo).
  const emojiPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': '🖥️',
    FRAMEWORK: '🧩'
  };
  const claseChipPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    FRAMEWORK: 'border-purple-400/40 bg-purple-400/10 text-purple-300'
  };

  const oportunidades = $derived(data.oportunidades);

  function diasRestantes(fecha: string): number {
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000);
  }

  function claseFecha(fecha: string): string {
    const dias = diasRestantes(fecha);
    if (dias < 0) return 'text-red-300'; // vencida
    if (dias <= 3) return 'text-amber-300'; // por vencer
    return 'text-tezcat-textSecondary';
  }

  function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TW-14: búsqueda textual + filtros por etiqueta (arrastrar y soltar).
  // El miembro arrastra chips del recuadro "Disponibles" al recuadro
  // "Filtros activos" (o hace clic: el arrastre no funciona en pantallas
  // táctiles). Las tareas con CUALQUIERA de las etiquetas activas son visibles.
  // ───────────────────────────────────────────────────────────────────────────
  let busqueda = $state('');
  let filtrosActivos = $state<string[]>([]);
  let arrastrandoEtiqueta = $state(false);

  const etiquetasDisponibles = $derived.by(() => {
    const mapa = new Map<string, Etiqueta>();
    for (const op of oportunidades) {
      for (const et of op.etiquetas) if (!mapa.has(et.nombre)) mapa.set(et.nombre, et);
    }
    return [...mapa.values()];
  });

  function alternarFiltro(nombre: string) {
    filtrosActivos = filtrosActivos.includes(nombre)
      ? filtrosActivos.filter((n) => n !== nombre)
      : [...filtrosActivos, nombre];
  }

  function alArrastrarEtiqueta(e: DragEvent, nombre: string) {
    e.dataTransfer?.setData('text/plain', nombre);
  }

  function alSoltarEtiqueta(e: DragEvent) {
    e.preventDefault();
    arrastrandoEtiqueta = false;
    const nombre = e.dataTransfer?.getData('text/plain');
    if (nombre && !filtrosActivos.includes(nombre)) {
      filtrosActivos = [...filtrosActivos, nombre];
    }
  }

  let conversionPendiente = $state<Oportunidad | null>(null);
  let confirmandoConversion = $state(false);
  const avisoConversion = $derived(form?.ok ?? '');

  function pedirConversion(op: Oportunidad) {
    conversionPendiente = op;
  }

  function cancelarConversion() {
    conversionPendiente = null;
  }


  const visibles = $derived(
    oportunidades.filter(
      (op) =>
        (function (op) {
          const termino = busqueda.trim().toLowerCase();
          const coincideBusqueda =
            termino === '' || `${op.titulo} ${op.descripcion}`.toLowerCase().includes(termino);
          const coincideFiltros =
            filtrosActivos.length === 0 ||
            op.etiquetas.some((et) => filtrosActivos.includes(et.nombre));
          return coincideBusqueda && coincideFiltros;
        })(op)
    )
  );

  const hayFiltros = $derived(busqueda.trim() !== '' || filtrosActivos.length > 0);

  function limpiarFiltros() {
    busqueda = '';
    filtrosActivos = [];
  }
</script>

<svelte:head>
  <title>Muro de oportunidades | Tezcat Workflow</title>
</svelte:head>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && conversionPendiente && !confirmandoConversion) cancelarConversion();
  }}
/>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
          TW-13 · TW-14 · TW-15 · Trabajo voluntario
        </p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Muro de oportunidades</h1>
        <p class="mt-1.5 max-w-2xl text-xs text-tezcat-textSecondary">
          Tareas opcionales publicadas por los encargados: nadie está asignado a ellas. Toma
          voluntariamente la que mejor combine con tus intereses y habilidades.
        </p>
      </div>

      {#if data.user.rol === 'ENCARGADO'}
        <a
          href="/tareas/nueva"
          class="inline-flex items-center gap-1.5 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2.5 text-xs font-bold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
        >
          <span class="material-symbols-outlined text-base">add</span>
          Publicar oportunidad
        </a>
      {/if}
    </div>

    {#if form?.error}<p role="alert" class="mb-5 rounded-xl border border-red-400/40 p-4 text-sm text-red-300">{form.error}</p>{/if}
    <!-- Aviso de conversión reciente (TW-15) -->
    {#if avisoConversion}
      <div
        class="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs text-amber-200"
      >
        <span class="flex items-start gap-2">
          <span class="material-symbols-outlined shrink-0 text-base">check_circle</span>
          {avisoConversion}
        </span>
        <button
          type="button"
          onclick={() => (form = null)}
          aria-label="Cerrar aviso"
          class="shrink-0 text-amber-200/70 transition-colors hover:text-amber-200"
        >
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    {/if}

    <!-- Búsqueda y filtros (TW-14) -->
    <section class="mb-6 space-y-3" aria-label="Búsqueda y filtros del Muro">
      <!-- Buscador -->
      <div class="relative rounded-xl shadow-sm">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
          <span class="material-symbols-outlined text-lg">search</span>
        </div>
        <input
          type="search"
          bind:value={busqueda}
          maxlength="120"
          placeholder="Buscar por título o descripción…"
          aria-label="Buscar oportunidades"
          class="block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 pr-3.5 pl-10 font-sans text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none"
        />
      </div>

      <!-- Recuadro 1: etiquetas disponibles · Recuadro 2: filtros activos -->
      <div class="grid gap-3 lg:grid-cols-2">
        <div class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 backdrop-blur-md">
          <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
            Etiquetas disponibles
          </p>
          <p class="mt-0.5 mb-3 text-[11px] text-tezcat-textMuted">
            Arrastra al recuadro de la derecha las que domines (o haz clic sobre ellas).
          </p>
          <div class="flex flex-wrap gap-1.5">
            {#each etiquetasDisponibles as et (et.nombre)}
              {#if !filtrosActivos.includes(et.nombre)}
                <button
                  type="button"
                  draggable="true"
                  ondragstart={(e) => alArrastrarEtiqueta(e, et.nombre)}
                  onclick={() => alternarFiltro(et.nombre)}
                  title="Arrastra o haz clic para filtrar por {et.nombre}"
                  class="inline-flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold transition-transform active:cursor-grabbing active:scale-95 {claseChipPorCategoria[et.categoria]}"
                >
                  <span aria-hidden="true">{emojiPorCategoria[et.categoria]}</span>
                  {et.nombre}
                  <span class="material-symbols-outlined text-xs" aria-hidden="true">add</span>
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <div
          role="region"
          aria-label="Zona para soltar las etiquetas que quieres usar como filtro"
          ondragover={(e) => {
            e.preventDefault();
            arrastrandoEtiqueta = true;
          }}
          ondragleave={() => (arrastrandoEtiqueta = false)}
          ondrop={alSoltarEtiqueta}
          class="rounded-2xl border border-dashed p-4 transition-colors
            {arrastrandoEtiqueta
              ? 'border-tezcat-cyan bg-tezcat-cyan/10'
              : filtrosActivos.length > 0
                ? 'border-tezcat-cyan/40 bg-tezcat-card/90 backdrop-blur-md'
                : 'border-tezcat-border bg-tezcat-bg/60'}"
        >
          <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
            Mis filtros
          </p>
          {#if filtrosActivos.length === 0}
            <p class="mt-2 flex items-center gap-2 text-[11px] text-tezcat-textMuted">
              <span class="material-symbols-outlined text-base">south_west</span>
              Suelta aquí las etiquetas que sepas usar y el Muro mostrará solo esas tareas.
            </p>
          {:else}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each filtrosActivos as nombre (nombre)}
                <button
                  type="button"
                  onclick={() => alternarFiltro(nombre)}
                  title="Quitar filtro {nombre}"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold {claseChipPorCategoria[etiquetasDisponibles.find((et) => et.nombre === nombre)?.categoria ?? 'FRAMEWORK']}"
                >
                  {#if etiquetasDisponibles.find((et) => et.nombre === nombre)}
                    <span aria-hidden="true">
                      {emojiPorCategoria[etiquetasDisponibles.find((et) => et.nombre === nombre)!.categoria]}
                    </span>
                  {/if}
                  {nombre}
                  <span class="material-symbols-outlined text-xs" aria-hidden="true">close</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Contador y limpiar -->
      {#if hayFiltros}
        <div class="flex items-center justify-between gap-3">
          <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Mostrando {visibles.length} de {oportunidades.length} oportunidades
          </p>
          <button
            type="button"
            onclick={limpiarFiltros}
            class="inline-flex items-center gap-1 text-xs font-semibold text-tezcat-cyan transition-colors hover:text-tezcat-cyanHover"
          >
            <span class="material-symbols-outlined text-sm">filter_alt_off</span>
            Limpiar filtros
          </button>
        </div>
      {/if}
    </section>

    <!-- Grid de oportunidades -->
    {#if visibles.length > 0}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each visibles as op (op.id)}
          <article
            class="flex flex-col rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-2xl backdrop-blur-md transition-colors hover:border-tezcat-cyan/40"
          >
            <!-- Etiquetas (TW-14): emoji y color por categoría -->
            <div class="flex flex-wrap gap-1.5">
              {#each op.etiquetas as et (et.nombre)}
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold {claseChipPorCategoria[et.categoria]}"
                >
                  <span aria-hidden="true">{emojiPorCategoria[et.categoria]}</span>
                  {et.nombre}
                </span>
              {/each}
            </div>

            <!-- Contenido -->
            <h2 class="mt-3 text-base font-bold text-tezcat-textPrimary">{op.titulo}</h2>
            <p class="mt-1.5 text-xs leading-relaxed text-tezcat-textSecondary line-clamp-3">
              {op.descripcion}
            </p>

            <!-- Meta -->
            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <span class="inline-flex items-center gap-1 text-tezcat-textSecondary">
                <span class="material-symbols-outlined text-sm text-tezcat-textMuted">person</span>
                {op.encargado}
              </span>
              <span class="inline-flex items-center gap-1 {claseFecha(op.fechaLimite)}">
                <span class="material-symbols-outlined text-sm">event</span>
                {formatearFecha(op.fechaLimite)}
              </span>
            </div>

            <!-- Acciones: solo los MIEMBROS toman tareas opcionales (TW-13).
                 El ENCARGADO no las ejecuta: solo publica (TW-13) y convierte (TW-15).
                 El ADMIN no participa del Muro. -->
            {#if data.user.rol === 'MIEMBRO' || data.user.rol === 'ENCARGADO'}
              <div class="mt-4 border-t border-tezcat-border/70 pt-4">
                {#if data.user.rol === 'MIEMBRO'}
                  <details class="text-sm">
                    <summary class="cursor-pointer font-semibold text-tezcat-cyan">Ver descripción completa y tomar tarea</summary>
                    <p class="my-4 whitespace-pre-wrap break-words text-tezcat-textSecondary">{op.descripcion || 'Sin descripción adicional.'}</p>
                    <form method="POST" action="?/tomar" use:enhance>
                      <input type="hidden" name="tareaId" value={op.id} />
                      <button type="submit" class="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950">Tomar tarea</button>
                    </form>
                  </details>
                {:else}
                  <!-- TW-15: abrir modal de confirmación de conversión -->
                  <button
                    type="button"
                    onclick={() => pedirConversion(op)}
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-xs font-bold tracking-wide text-amber-300 transition-colors hover:bg-amber-400/20"
                  >
                    <span class="material-symbols-outlined text-base">upgrade</span>
                    Convertir en obligatoria
                  </button>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else if hayFiltros}
      <!-- Sin resultados para los filtros actuales -->
      <div class="rounded-2xl border border-dashed border-tezcat-border p-12 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">search_off</span>
        <p class="mt-3 text-sm font-bold text-tezcat-textPrimary">
          No hay oportunidades que coincidan con tu búsqueda
        </p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-tezcat-textSecondary">
          Prueba con otras etiquetas o cambia el texto de búsqueda.
        </p>
        <button
          type="button"
          onclick={limpiarFiltros}
          class="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2 text-xs font-bold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
        >
          <span class="material-symbols-outlined text-sm">filter_alt_off</span>
          Limpiar filtros
        </button>
      </div>
    {:else}
      <!-- Estado vacío -->
      <div class="rounded-2xl border border-dashed border-tezcat-border p-12 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">storefront</span>
        <p class="mt-3 text-sm font-bold text-tezcat-textPrimary">Aún no hay oportunidades publicadas</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-tezcat-textSecondary">
          Cuando un encargado publique una tarea opcional aparecerá aquí, lista para que cualquier
          miembro la tome voluntariamente.
        </p>
      </div>
    {/if}

    <!-- Modal TW-15: confirmar conversión de opcional a obligatoria -->
    {#if conversionPendiente}
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Cerrar y cancelar"
          onclick={cancelarConversion}
          class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        ></button>

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-conversion"
          class="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-400/40 bg-tezcat-card p-6 shadow-2xl"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10"
            >
              <span class="material-symbols-outlined text-xl text-amber-300">upgrade</span>
            </span>
            <div class="min-w-0">
              <h2 id="titulo-modal-conversion" class="text-sm font-bold text-white">
                Convertir en obligatoria
              </h2>
              <p class="mt-0.5 text-[11px] text-tezcat-textSecondary">
                La tarea «{conversionPendiente.titulo}» saldrá del Muro.
              </p>
            </div>
          </div>

          <p class="my-4 whitespace-pre-wrap break-words text-sm text-tezcat-textSecondary">{conversionPendiente.descripcion || 'Sin descripción adicional.'}</p>
          <form method="POST" action="?/convertir" use:enhance={() => {
            confirmandoConversion = true;
            return async ({ result, update }) => {
              confirmandoConversion = false;
              if (result.type === 'success') conversionPendiente = null;
              await update();
            };
          }}>
            <input type="hidden" name="tareaId" value={conversionPendiente.id} />
            <label for="responsable-muro" class="block text-sm">Miembro responsable</label>
            <select id="responsable-muro" name="responsableId" required class="mt-2 w-full rounded-xl border border-tezcat-border bg-tezcat-bg p-3 text-sm">
              <option value="">Selecciona un miembro…</option>
              {#each data.miembros as miembro (miembro.id)}<option value={miembro.id}>{miembro.nombre}</option>{/each}
            </select>
            {#if data.miembros.length === 0}<p class="mt-2 text-xs text-amber-300">No hay miembros activos en tu departamento.</p>{/if}
            {#if form?.error}<p role="alert" class="mt-3 text-sm text-red-300">{form.error}</p>{/if}
            <div class="mt-5 flex justify-end gap-3">
              <button type="button" onclick={cancelarConversion} disabled={confirmandoConversion} class="rounded-xl border border-tezcat-border px-4 py-3 text-sm">Cancelar</button>
              <button type="submit" disabled={confirmandoConversion || data.miembros.length === 0} class="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{confirmandoConversion ? 'Convirtiendo…' : 'Convertir y asignar'}</button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </main>
</div>
