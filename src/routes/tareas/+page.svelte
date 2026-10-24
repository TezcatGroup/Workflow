<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data }: { data: PageData } = $props();

  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', TERMINADA: 'Terminada'
  };

  const claseEstado: Record<string, string> = {
    ASIGNADA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    EN_PROCESO: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    EN_REVISION: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
    TERMINADA: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
  };

  const iconoEstado: Record<string, string> = {
    ASIGNADA: 'assignment_ind', EN_PROCESO: 'progress_activity', EN_REVISION: 'rate_review', TERMINADA: 'task_alt'
  };

  const clasePrioridad: Record<string, string> = {
    BAJA: 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary',
    MEDIA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    ALTA: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    URGENTE: 'border-red-400/40 bg-red-400/10 text-red-300'
  };

  const fecha = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : 'Sin fecha';

  const horaCorta = (d: Date | string) =>
    new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

  function diasRestantes(d: Date): number {
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  }

  function textoVencimiento(t: (typeof data.tareas)[number]): { texto: string; urgente: boolean } {
    if (t.reasignadaDelUsuario) return { texto: 'Reasignada a otro miembro', urgente: false };
    if (t.estado === 'TERMINADA') return { texto: 'Completada', urgente: false };
    const dias = diasRestantes(t.fechaLimite);
    if (dias < 0) return { texto: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`, urgente: true };
    if (dias === 0) return { texto: 'Vence hoy', urgente: true };
    if (dias === 1) return { texto: 'Vence mañana', urgente: false };
    return { texto: `Vence en ${dias} días`, urgente: false };
  }

  // =========================================================================
  // LÓGICA TW-10 y TW-11: Formateadores de Eventos Centrales para el Drawer
  // =========================================================================
  type EventoDrawer = Extract<(typeof data.tareas)[number]['timeline'][number], { tipoItem: 'EVENTO' }>;

  function textoEvento(e: EventoDrawer): string {
    const detalle = e.detalle as {
      de?: string;
      a?: string;
      nombre?: string;
      esEnlace?: boolean;
      nuevoResponsableNombre?: string;
    } | null;

    if (e.tipo === 'TAREA_CREADA') return 'Tarea creada';
    if (e.tipo === 'CAMBIO_ESTADO' && detalle?.de && detalle?.a) {
      if (detalle.de === 'EN_REVISION' && detalle.a === 'EN_PROCESO') {
        return 'Se devolvió la tarea a En proceso';
      }
      if (detalle.a === 'EN_PROCESO') return 'Inició la tarea (En proceso)';
      if (detalle.a === 'EN_REVISION') return 'Envió la tarea a revisión';
      if (detalle.a === 'TERMINADA') return 'Tarea aprobada y terminada';
      return `Cambió de ${textoEstado[detalle.de] ?? detalle.de} a ${textoEstado[detalle.a] ?? detalle.a}`;
    }
    if (e.tipo === 'ARCHIVO_SUBIDO') {
      return detalle?.esEnlace
        ? `Adjuntó enlace: ${detalle.nombre ?? 'recurso'}`
        : `Adjuntó archivo: ${detalle?.nombre ?? 'documento'}`;
    }
    if (e.tipo === 'ARCHIVO_ELIMINADO') {
      return `Eliminó adjunto: ${detalle?.nombre ?? 'archivo'}`;
    }
    if (e.tipo === 'SOLICITUD_REASIGNACION') return 'Solicitó cambio de asignación';
    if (e.tipo === 'REASIGNACION_APROBADA') {
      return `Reasignada a ${detalle?.nuevoResponsableNombre ?? 'otro miembro'}`;
    }
    if (e.tipo === 'REASIGNACION_RECHAZADA') return 'Solicitud de reasignación denegada';
    return e.tipo;
  }

  function iconoEvento(e: EventoDrawer): string {
    const detalle = e.detalle as { de?: string; a?: string; esEnlace?: boolean } | null;
    if (e.tipo === 'TAREA_CREADA') return 'add_task';
    if (e.tipo === 'CAMBIO_ESTADO') {
      if (detalle?.de === 'EN_REVISION' && detalle?.a === 'EN_PROCESO') return 'replay';
      if (detalle?.a === 'EN_PROCESO') return 'play_arrow';
      if (detalle?.a === 'EN_REVISION') return 'rate_review';
      if (detalle?.a === 'TERMINADA') return 'task_alt';
      return 'sync_alt';
    }
    if (e.tipo === 'ARCHIVO_SUBIDO') return detalle?.esEnlace ? 'link' : 'attach_file';
    if (e.tipo === 'ARCHIVO_ELIMINADO') return 'delete';
    if (e.tipo === 'SOLICITUD_REASIGNACION') return 'swap_horiz';
    if (e.tipo === 'REASIGNACION_APROBADA') return 'how_to_reg';
    if (e.tipo === 'REASIGNACION_RECHAZADA') return 'block';
    return 'info';
  }

  function claseEvento(e: EventoDrawer): string {
    const detalle = e.detalle as { de?: string; a?: string } | null;
    if (e.tipo === 'TAREA_CREADA') return 'border-tezcat-cyan/30 bg-tezcat-cyan/10 text-tezcat-cyan';
    if (e.tipo === 'CAMBIO_ESTADO') {
      if (detalle?.de === 'EN_REVISION' && detalle?.a === 'EN_PROCESO') {
        return 'border-amber-400/35 bg-amber-400/10 text-amber-300';
      }
      if (detalle?.a === 'EN_REVISION') return 'border-violet-400/35 bg-violet-400/10 text-violet-300';
      if (detalle?.a === 'TERMINADA') return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300';
    }
    if (e.tipo === 'ARCHIVO_ELIMINADO' || e.tipo === 'REASIGNACION_RECHAZADA') {
      return 'border-red-400/30 bg-red-400/10 text-red-300';
    }
    if (e.tipo === 'SOLICITUD_REASIGNACION') return 'border-amber-400/35 bg-amber-400/10 text-amber-300';
    if (e.tipo === 'REASIGNACION_APROBADA') return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300';
    return 'border-tezcat-border/80 bg-tezcat-surfaceAlt/60 text-tezcat-textSecondary';
  }

  // Filtros reactivos
  let filtroMiembro = $state<string>('TODOS');
  let filtroEstado = $state<string>('TODOS');
  let busqueda = $state<string>('');

  const miembrosUnicos = $derived(
    Array.from(new Set(data.tareas.map((t) => t.responsableNombre).filter((n): n is string => Boolean(n)))).sort()
  );

  const tareasFiltradas = $derived(
    data.tareas.filter((t) => {
      const coincideMiembro = filtroMiembro === 'TODOS' || t.responsableNombre === filtroMiembro;
      const coincideEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'REASIGNADA' ? t.reasignadaDelUsuario : t.estado === filtroEstado);
      const termino = busqueda.trim().toLowerCase();
      const coincideBusqueda =
        !termino ||
        t.titulo.toLowerCase().includes(termino) ||
        `core-${t.numero ?? ''}`.toLowerCase().includes(termino) ||
        (t.responsableNombre ?? '').toLowerCase().includes(termino);
      return coincideMiembro && coincideEstado && coincideBusqueda;
    })
  );

  // Estado para el Chat Flotante Contextual con Timeline (TW-09 y TW-10)
  let tareaChatActivaId = $state<string | null>(null);
  let textoMensajeRapido = $state<string>('');
  let enviandoMensaje = $state<boolean>(false);
  let contenedorDrawerRef = $state<HTMLDivElement | null>(null);

  const tareaChatActiva = $derived(data.tareas.find((t) => t.id === tareaChatActivaId) ?? null);

  $effect(() => {
    const _total = tareaChatActiva?.timeline?.length ?? 0;
    if (contenedorDrawerRef && _total > 0) {
      contenedorDrawerRef.scrollTop = contenedorDrawerRef.scrollHeight;
    }
  });

  const porEstado = $derived({
    asignadas: data.tareas.filter((t) => !t.reasignadaDelUsuario && t.estado === 'ASIGNADA').length,
    enProceso: data.tareas.filter((t) => !t.reasignadaDelUsuario && t.estado === 'EN_PROCESO').length,
    enRevision: data.tareas.filter((t) => !t.reasignadaDelUsuario && t.estado === 'EN_REVISION').length,
    terminadas: data.tareas.filter((t) => !t.reasignadaDelUsuario && t.estado === 'TERMINADA').length,
    vencidas: data.tareas.filter(
      (t) => !t.reasignadaDelUsuario && t.estado !== 'TERMINADA' && diasRestantes(t.fechaLimite) < 0
    ).length
  });
</script>

<svelte:head><title>Tareas | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
          Sprint 6 · Trazabilidad, delegación y conversación
        </p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Tareas</h1>
        <p class="mt-1.5 text-xs text-tezcat-textSecondary">
          {#if data.user.rol === 'MIEMBRO'}
            Tareas asignadas a ti, ordenadas por fecha límite.
          {:else if data.user.rol === 'ENCARGADO'}
            Tareas de tu departamento. Filtra por miembro asignado o abre la línea de tiempo y conversación de cada tarea.
          {:else}
            Todas las tareas del sistema (solo lectura).
          {/if}
        </p>
      </div>

      {#if data.puedeCrear}
        <a
          href="/tareas/nueva"
          class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-4 py-2.5 text-sm font-bold tracking-wide text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-lg">add_task</span>
          Nueva tarea
        </a>
      {/if}
    </div>

    <!-- Métricas rápidas -->
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">Asignadas</p>
        <p class="mt-1 text-2xl font-bold text-tezcat-cyan">{porEstado.asignadas}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">En proceso</p>
        <p class="mt-1 text-2xl font-bold text-amber-300">{porEstado.enProceso}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">En revisión</p>
        <p class="mt-1 text-2xl font-bold text-violet-300">{porEstado.enRevision}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">Terminadas</p>
        <p class="mt-1 text-2xl font-bold text-emerald-300">{porEstado.terminadas}</p>
      </div>
    </div>

    {#if porEstado.vencidas > 0}
      <div
        role="alert"
        class="mb-6 flex items-center gap-2.5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300"
      >
        <span class="material-symbols-outlined shrink-0 text-base">warning</span>
        <span>Hay {porEstado.vencidas} tarea{porEstado.vencidas === 1 ? '' : 's'} con fecha límite vencida.</span>
      </div>
    {/if}

    <!-- Barra de filtros por Miembro, Estado y Búsqueda -->
    {#if data.tareas.length > 0}
      <div class="mb-5 grid gap-3 rounded-2xl border border-tezcat-border bg-tezcat-card/80 p-4 sm:grid-cols-3">
        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
            search
          </span>
          <input
            type="search"
            bind:value={busqueda}
            placeholder="Buscar por título o CORE-..."
            class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
          />
        </div>

        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
            person_search
          </span>
          <select
            bind:value={filtroMiembro}
            aria-label="Filtrar por miembro responsable"
            class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
          >
            <option value="TODOS">Todos los miembros ({miembrosUnicos.length})</option>
            {#each miembrosUnicos as nombre (nombre)}
              <option value={nombre}>{nombre}</option>
            {/each}
          </select>
        </div>

        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
            filter_list
          </span>
          <select
            bind:value={filtroEstado}
            aria-label="Filtrar por estado de la tarea"
            class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ASIGNADA">Asignadas</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="TERMINADA">Terminadas</option>
            {#if data.user.rol === 'MIEMBRO'}
              <option value="REASIGNADA">Reasignadas</option>
            {/if}
          </select>
        </div>
      </div>
    {/if}

    <!-- Listado -->
    {#if data.tareas.length === 0}
      <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/50 px-6 py-14 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">inbox</span>
        <p class="text-sm font-semibold">No hay tareas para mostrar</p>
        <p class="max-w-sm text-xs text-tezcat-textSecondary">
          {#if data.puedeCrear}
            Crea la primera tarea obligatoria para tu departamento.
          {:else}
            Cuando te asignen una tarea, aparecerá aquí.
          {/if}
        </p>
        {#if data.puedeCrear}
          <a
            href="/tareas/nueva"
            class="mt-2 inline-flex items-center gap-2 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2 text-sm font-semibold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
          >
            <span class="material-symbols-outlined text-lg">add_task</span>
            Crear tarea
          </a>
        {/if}
      </div>
    {:else if tareasFiltradas.length === 0}
      <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/40 px-6 py-10 text-center">
        <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">filter_alt_off</span>
        <p class="text-sm font-semibold">Ninguna tarea coincide con el filtro seleccionado</p>
        <button
          type="button"
          onclick={() => {
            filtroMiembro = 'TODOS';
            filtroEstado = 'TODOS';
            busqueda = '';
          }}
          class="mt-1 text-xs font-semibold text-tezcat-cyan hover:underline"
        >
          Restablecer filtros
        </button>
      </div>
    {:else}
      <ul class="space-y-3">
        {#each tareasFiltradas as t (t.id)}
          {@const vencimiento = textoVencimiento(t)}
          <li class="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-md backdrop-blur-md transition-all hover:border-tezcat-cyan/50 hover:shadow-glow-cyan/20 {t.reasignadaDelUsuario ? 'opacity-75' : ''}">
            <a href="/tareas/{t.id}" class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-cyan uppercase">
                  CORE-{t.numero ?? '?'}
                </span>
                <span class="rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase {clasePrioridad[t.prioridad ?? ''] ?? 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary'}">
                  {t.prioridad ?? '—'}
                </span>
                {#if t.tieneSolicitudReasignacion && data.user.rol === 'ENCARGADO'}
                  <span class="inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                    <span class="material-symbols-outlined text-xs">swap_horiz</span>
                    Solicitud de reasignación
                  </span>
                {/if}
                {#if t.devueltaEnRevision && !t.reasignadaDelUsuario}
                  <span class="inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                    <span class="material-symbols-outlined text-xs">replay</span>
                    Entrega devuelta
                  </span>
                {/if}
                {#if !t.reasignadaDelUsuario && t.estado !== 'TERMINADA' && vencimiento.urgente}
                  <span class="inline-flex items-center gap-1 font-mono text-[10px] font-semibold tracking-wider text-red-300 uppercase">
                    <span class="material-symbols-outlined text-xs">warning</span>
                    {vencimiento.texto}
                  </span>
                {/if}
              </div>
              <p class="mt-1.5 truncate font-semibold text-white group-hover:text-tezcat-cyan">{t.titulo}</p>
              <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tezcat-textSecondary">
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">person</span>
                  {t.responsableNombre ?? 'Sin asignar'}
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">event</span>
                  {fecha(t.fechaLimite)} · {vencimiento.texto}
                </span>
              </p>
            </a>

            <div class="flex items-center gap-2.5">
              <!-- Botón para abrir Chat y Timeline Contextual Rápido (TW-09 y TW-10) -->
              <button
                type="button"
                onclick={() => (tareaChatActivaId = t.id)}
                title="Abrir conversación y actividad de la tarea"
                class="inline-flex items-center gap-1.5 rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-2.5 py-1.5 font-mono text-[11px] font-semibold text-tezcat-textSecondary transition-colors hover:border-tezcat-cyan/50 hover:text-tezcat-cyan"
              >
                <span class="material-symbols-outlined text-sm">forum</span>
                <span>{t.totalComentarios ?? 0}</span>
              </button>

              {#if t.reasignadaDelUsuario}
                <a
                  href="/tareas/{t.id}"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-amber-300 uppercase"
                >
                  <span class="material-symbols-outlined text-sm">swap_horiz</span>
                  Reasignada
                </a>
              {:else}
                <a
                  href="/tareas/{t.id}"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase {claseEstado[t.estado] ?? ''}"
                >
                  <span class="material-symbols-outlined text-sm">{iconoEstado[t.estado] ?? 'label'}</span>
                  {textoEstado[t.estado] ?? t.estado}
                </a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </main>

  <!-- Ventana Flotante / Drawer de Conversación y Timeline por Tarea (TW-09, TW-10 y TW-11) -->
  {#if tareaChatActiva}
    <div class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div class="flex h-full w-full max-w-md flex-col border-l border-tezcat-border bg-tezcat-card shadow-2xl">
        <!-- Encabezado del chat flotante -->
        <div class="flex items-start justify-between gap-3 border-b border-tezcat-border p-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] font-bold tracking-wider text-tezcat-cyan uppercase">
                CORE-{tareaChatActiva.numero ?? '?'} · TW-09 · TW-10
              </span>
              {#if tareaChatActiva.reasignadaDelUsuario}
                <span class="rounded border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300 uppercase">
                  Reasignada
                </span>
              {:else}
                <span class="rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase {claseEstado[tareaChatActiva.estado] ?? ''}">
                  {textoEstado[tareaChatActiva.estado] ?? tareaChatActiva.estado}
                </span>
              {/if}
            </div>
            <h2 class="mt-1 truncate text-sm font-bold text-white">{tareaChatActiva.titulo}</h2>
            <p class="mt-0.5 text-[11px] text-tezcat-textSecondary">
              Responsable: <strong class="text-tezcat-textPrimary">{tareaChatActiva.responsableNombre ?? 'Sin asignar'}</strong>
            </p>
          </div>
          <button
            type="button"
            onclick={() => (tareaChatActivaId = null)}
            class="rounded-lg p-1 text-tezcat-textMuted transition-colors hover:bg-tezcat-surfaceAlt hover:text-white"
            aria-label="Cerrar conversación"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Lista de mensajes y eventos del Timeline (TW-10) -->
        <div bind:this={contenedorDrawerRef} class="flex-1 space-y-3 overflow-y-auto p-4">
          {#if (tareaChatActiva.timeline ?? []).length === 0}
            <div class="flex h-full flex-col items-center justify-center text-center text-tezcat-textMuted">
              <span class="material-symbols-outlined text-3xl">chat_bubble_outline</span>
              <p class="mt-2 text-xs font-semibold">Sin actividad ni mensajes en esta tarea</p>
              <p class="mt-1 max-w-xs text-[11px]">
                Inicia la conversación con {tareaChatActiva.responsableNombre ?? 'el equipo'} para aclarar dudas o avances.
              </p>
            </div>
          {:else}
            {#each tareaChatActiva.timeline as item (`${item.tipoItem}-${item.id}`)}
              {#if item.tipoItem === 'EVENTO'}
                <!-- TW-10: Píldora central minimalista de evento dentro del Drawer -->
                <div class="my-1.5 flex items-center justify-center gap-2">
                  <span class="h-px flex-1 bg-tezcat-border/50"></span>
                  <div
                    class="inline-flex max-w-[92%] flex-wrap items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-center font-mono text-[10px] leading-tight
                      {claseEvento(item)}"
                  >
                    <span class="material-symbols-outlined text-xs">{iconoEvento(item)}</span>
                    <span class="font-semibold">{textoEvento(item)}</span>
                    <span class="opacity-75">
                      · {horaCorta(item.creadoEn)}{item.actorNombre ? ` · ${item.actorNombre}` : ''}
                    </span>
                  </div>
                  <span class="h-px flex-1 bg-tezcat-border/50"></span>
                </div>
              {:else}
                <!-- TW-09: Burbuja de mensaje normal -->
                {@const esMio = item.autorId === data.user.id}
                <div class="flex flex-col {esMio ? 'items-end' : 'items-start'}">
                  <div class="mb-1 flex items-center gap-1.5 font-mono text-[10px] text-tezcat-textMuted">
                    <span class="font-semibold text-tezcat-textSecondary">{item.autorNombre}</span>
                    <span class="rounded bg-tezcat-surfaceAlt px-1 py-0.2 text-[9px] text-tezcat-cyan uppercase">{item.autorRol}</span>
                    <span>· {horaCorta(item.creadoEn)}</span>
                  </div>
                  <div
                    class="max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed
                      {esMio
                        ? 'rounded-tr-xs border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-textPrimary'
                        : 'rounded-tl-xs border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textPrimary'}"
                  >
                    <p class="whitespace-pre-line">{item.contenido}</p>
                  </div>
                </div>
              {/if}
            {/each}
          {/if}
        </div>

        <!-- Formulario para enviar mensaje rápido (o aviso de reasignación si ya no es suya) -->
        <div class="border-t border-tezcat-border bg-tezcat-bg/90 p-3">
          {#if tareaChatActiva.reasignadaDelUsuario}
            <div class="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-[11px] text-amber-200">
              Se ha validado la reasignación de la actividad que se le había imputado. El chat está deshabilitado para esta tarea.
            </div>
          {:else}
            <form
              method="POST"
              action="?/enviarMensajeRapido"
              class="flex items-end gap-2"
              use:enhance={() => {
                enviandoMensaje = true;
                return async ({ update }) => {
                  enviandoMensaje = false;
                  textoMensajeRapido = '';
                  await update();
                };
              }}
            >
              <input type="hidden" name="tareaId" value={tareaChatActiva.id} />
              <textarea
                name="contenido"
                rows="2"
                required
                maxlength="2000"
                bind:value={textoMensajeRapido}
                placeholder="Escribe un mensaje sobre esta tarea…"
                class="flex-1 resize-none rounded-xl border border-tezcat-border bg-tezcat-card px-3 py-2 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
              ></textarea>
              <button
                type="submit"
                disabled={enviandoMensaje || !textoMensajeRapido.trim()}
                class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-tezcat-cyan text-slate-950 transition-opacity hover:bg-tezcat-cyanHover disabled:opacity-40"
                title="Enviar mensaje"
              >
                <span class="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          {/if}
          <div class="mt-2 flex justify-between text-[11px]">
            <a
              href="/tareas/{tareaChatActiva.id}#conversacion"
              class="inline-flex items-center gap-1 font-semibold text-tezcat-cyan hover:underline"
            >
              Ir al detalle completo, checklist y archivos
              <span class="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>