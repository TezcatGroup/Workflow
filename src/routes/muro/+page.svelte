<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data }: { data: PageData } = $props();

  // ───────────────────────────────────────────────────────────────────────────
  // DATOS DE EJEMPLO (maquetación TW-13).
  // TODO (contrato Sprint 7): reemplazar por los datos reales que cargue el
  // +page.server.ts cuando el backend publique el endpoint del Muro.
  // ───────────────────────────────────────────────────────────────────────────
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

  // Fechas relativas para que la maquetación nunca se vea vencida con el tiempo.
  const enDias = (dias: number) =>
    new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

  const oportunidades: Oportunidad[] = [
    {
      id: 'ej-01',
      titulo: 'Documentar endpoints del laboratorio',
      descripcion:
        'Redactar y publicar la referencia de los endpoints internos del sistema, con ejemplos de petición y respuesta para cada uno.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(12),
      etiquetas: [
        { nombre: 'TypeScript', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'Svelte', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-02',
      titulo: 'Script de respaldo de la base de datos',
      descripcion:
        'Crear un script que genere respaldos automáticos semanales de PostgreSQL y conserve el historial del último mes.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(2),
      etiquetas: [
        { nombre: 'SQL', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' }
      ]
    },
    {
      id: 'ej-03',
      titulo: 'Rediseñar la pantalla de perfil',
      descripcion:
        'Modernizar la vista de perfil con la paleta Tezcat, incluyendo estados vacíos y la versión para móvil.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(5),
      etiquetas: [
        { nombre: 'Svelte', categoria: 'FRAMEWORK' },
        { nombre: 'Tailwind CSS', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-04',
      titulo: 'Chatbot de dudas frecuentes',
      descripcion:
        'Prototipo conversacional que responda las preguntas más comunes del laboratorio a partir de un banco de respuestas.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(20),
      etiquetas: [{ nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' }]
    },
    {
      id: 'ej-05',
      titulo: 'Panel de métricas de uso de equipos',
      descripcion:
        'Pequeño tablero con gráficas de uso de las máquinas del laboratorio por semana, para detectar las horas valle.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(-1),
      etiquetas: [
        { nombre: 'TypeScript', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'React', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-06',
      titulo: 'Automatizar registro de entradas',
      descripcion:
        'Sustituir el registro en papel con un lector de códigos que alimente la bitácora digital del laboratorio.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(8),
      etiquetas: [
        { nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'SQL', categoria: 'LENGUAJE DE PROGRAMACIÓN' }
      ]
    }
  ];

  function diasRestantes(fecha: string): number {
    return Math.ceil((new Date(`${fecha}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  }

  function claseFecha(fecha: string): string {
    const dias = diasRestantes(fecha);
    if (dias < 0) return 'text-red-300'; // vencida
    if (dias <= 3) return 'text-amber-300'; // por vencer
    return 'text-tezcat-textSecondary';
  }

  function formatearFecha(fecha: string): string {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TW-14: búsqueda textual + filtros por etiqueta (arrastrar y soltar).
  // El miembro arrastra chips del recuadro "Disponibles" al recuadro
  // "Filtros activos" (o hace clic: el arrastre no funciona en pantallas
  // táctiles). Las tareas con CUALQUIERA de las etiquetas activas son visibles.
  // TODO (contrato Sprint 7): cuando el backend exponga las etiquetas por
  // departamento, etiquetasDisponibles se llena desde data en lugar del Muro.
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

  // ───────────────────────────────────────────────────────────────────────────
  // TW-15: conversión de opcional a obligatoria.
  // El ENCARGADO confirma en un modal; el backend (contrato Sprint 7) hará la
  // asignación a un MIEMBRO aleatorio. La vista solo presenta la confirmación
  // y el resultado, la regla vive en el servidor.
  // ───────────────────────────────────────────────────────────────────────────
  let conversionPendiente = $state<Oportunidad | null>(null);
  let confirmandoConversion = $state(false);
  let convertidas = $state<string[]>([]);
  let avisoConversion = $state('');

  function pedirConversion(op: Oportunidad) {
    conversionPendiente = op;
  }

  function cancelarConversion() {
    conversionPendiente = null;
  }

  async function confirmarConversion() {
    if (!conversionPendiente) return;
    confirmandoConversion = true;
    // TODO (contrato Sprint 7): reemplazar esta espera simulada por el POST
    // real de conversión. El servidor elige un MIEMBRO aleatorio y responde
    // con el nombre de la persona asignada para mostrarlo en el aviso.
    await new Promise((r) => setTimeout(r, 800));
    convertidas = [...convertidas, conversionPendiente.id];
    avisoConversion = `«${conversionPendiente.titulo}» se convirtió en obligatoria. La asignación al miembro aleatorio la hará el backend cuando el contrato esté listo.`;
    confirmandoConversion = false;
    conversionPendiente = null;
  }

  const visibles = $derived(
    oportunidades.filter(
      (op) =>
        !convertidas.includes(op.id) &&
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
          onclick={() => (avisoConversion = '')}
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
                  <!-- TODO: conectar con el endpoint "tomar tarea" del contrato (TW-13) -->
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-xs font-bold tracking-wide text-slate-950 transition-all hover:from-emerald-300 hover:to-teal-300 active:scale-[0.99]"
                  >
                    <span class="material-symbols-outlined text-base">volunteer_activism</span>
                    Tomar tarea
                  </button>
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
          class="relative w-full max-w-md rounded-2xl border border-amber-400/40 bg-tezcat-card p-6 shadow-2xl"
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

          <div class="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs leading-relaxed text-amber-200">
            <p class="flex items-start gap-2">
              <span class="material-symbols-outlined shrink-0 text-base">shuffle</span>
              <span>
                Al confirmar, el sistema asignará esta tarea a un <strong>miembro aleatorio</strong>
                y pasará al flujo normal de trabajo (asignada → en proceso → revisión → terminada).
                Esta acción no se puede deshacer.
              </span>
            </p>
          </div>

          <div class="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onclick={cancelarConversion}
              disabled={confirmandoConversion}
              class="inline-flex items-center justify-center rounded-xl border border-tezcat-border px-4 py-2.5 text-xs font-semibold text-tezcat-textSecondary transition-colors hover:border-tezcat-borderHighlight hover:text-tezcat-textPrimary disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onclick={confirmarConversion}
              disabled={confirmandoConversion}
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/20 px-5 py-2.5 text-xs font-bold tracking-wide text-amber-200 transition-colors hover:bg-amber-400/30 disabled:opacity-70"
            >
              {#if confirmandoConversion}
                <span class="material-symbols-outlined animate-spin text-base">refresh</span>
                <span>Convirtiendo…</span>
              {:else}
                <span class="material-symbols-outlined text-base">upgrade</span>
                <span>Sí, convertir</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>