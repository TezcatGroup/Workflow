<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Contrato de datos y acciones: ver +page.server.ts (propiedad del backend).
  // transicionesPermitidas define qué botones de avance puede usar esta persona;
  // vacío = solo lectura. El backend valida permisos y transiciones; la vista solo presenta.

  const flujoEstados = ['ASIGNADA', 'EN_PROCESO', 'EN_REVISION', 'TERMINADA'];
  const indiceEstado = $derived(flujoEstados.indexOf(data.tarea.estado));

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

  const iconoBoton: Record<string, string> = {
    EN_PROCESO: 'play_arrow', EN_REVISION: 'rate_review', TERMINADA: 'task_alt'
  };

  const iconoEvento: Record<string, string> = {
    TAREA_CREADA: 'add_task', CAMBIO_ESTADO: 'sync_alt'
  };

  function textoBoton(destino: string): string {
    if (destino === 'EN_PROCESO') return data.tarea.estado === 'EN_REVISION' ? 'Devolver a en proceso' : 'Iniciar tarea';
    if (destino === 'EN_REVISION') return 'Enviar a revisión';
    if (destino === 'TERMINADA') return 'Marcar como terminada';
    return textoEstado[destino] ?? destino;
  }

  const fecha = (d: Date | null) =>
    d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha';

  function textoEvento(e: (typeof data.eventos)[number]): string {
    const detalle = e.detalle as { de?: string; a?: string } | null;
    if (e.tipo === 'CAMBIO_ESTADO' && detalle?.de && detalle?.a) {
      return `Cambió de ${textoEstado[detalle.de] ?? detalle.de} a ${textoEstado[detalle.a] ?? detalle.a}`;
    }
    if (e.tipo === 'TAREA_CREADA') return 'Tarea creada';
    return e.tipo;
  }

  // ¿Venció la fecha límite sin terminar la tarea?
  const vencida = $derived(
    data.tarea.estado !== 'TERMINADA' && new Date(data.tarea.fechaLimite).getTime() < Date.now()
  );

  const etiqueta = 'font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';
  let enviando = $state(false);
</script>

<svelte:head><title>{data.tarea.titulo} | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div>
      <a
        href="/tareas"
        class="inline-flex items-center gap-1 text-xs font-semibold text-tezcat-cyan transition-colors hover:text-tezcat-cyanHover"
      >
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Volver a tareas
      </a>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span class="rounded-md border border-tezcat-border bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-tezcat-cyan uppercase">
          CORE-{data.tarea.numero ?? '?'}
        </span>
        <span class="rounded-md border border-tezcat-border bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[11px] tracking-wider text-tezcat-textSecondary uppercase">
          {data.tarea.tipo}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase {claseEstado[data.tarea.estado] ?? ''}">
          <span class="material-symbols-outlined text-sm">{iconoEstado[data.tarea.estado] ?? 'label'}</span>
          {textoEstado[data.tarea.estado] ?? data.tarea.estado}
        </span>
      </div>

      <h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{data.tarea.titulo}</h1>

      <!-- Stepper de avance -->
      <ol class="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
        {#each flujoEstados as paso, i (paso)}
          {@const esActual = i === indiceEstado}
          {@const hecho = i < indiceEstado}
          <li class="flex items-center gap-2">
            <span
              class="flex size-5 items-center justify-center rounded-full border font-mono text-[10px] font-bold
                {esActual
                  ? 'border-tezcat-cyan bg-tezcat-cyan text-slate-950'
                  : hecho
                    ? 'border-tezcat-cyan/60 bg-tezcat-cyan/20 text-tezcat-cyan'
                    : 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textMuted'}"
            >
              {hecho ? '✓' : i + 1}
            </span>
            <span class="font-mono text-[10px] tracking-wider uppercase {esActual ? 'text-tezcat-cyan' : 'text-tezcat-textMuted'}">
              {textoEstado[paso]}
            </span>
          </li>
          {#if i < flujoEstados.length - 1}
            <span class="h-px w-4 bg-tezcat-border sm:w-6"></span>
          {/if}
        {/each}
      </ol>
    </div>

    <!-- Mensajes -->
    {#if form?.error}
      <div role="alert" class="flex items-start gap-2.5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300">
        <span class="material-symbols-outlined shrink-0 text-base">error</span>
        <span>{form.error}</span>
      </div>
    {:else if form?.ok}
      <div role="status" class="flex items-start gap-2.5 rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 p-3 text-xs text-tezcat-cyan">
        <span class="material-symbols-outlined shrink-0 text-base">check_circle</span>
        <span>{form.ok}</span>
      </div>
    {/if}

    <!-- Acciones de avance (TW-05): el backend decide cuáles mostrar -->
    {#if data.transicionesPermitidas.length > 0}
      <section class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-2xl backdrop-blur-md">
        <p class={etiqueta}>Actualizar avance</p>
        <div class="mt-3 flex flex-wrap gap-3">
          {#each data.transicionesPermitidas as destino (destino)}
            <form
              method="POST"
              action="?/cambiarEstado"
              use:enhance={() => {
                enviando = true;
                return async ({ update }) => {
                  enviando = false;
                  await update();
                };
              }}
            >
              <input type="hidden" name="estado" value={destino} />
              <button
                type="submit"
                disabled={enviando}
                class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60
                  {destino === 'TERMINADA'
                    ? 'border-transparent bg-linear-to-r from-tezcat-cyan to-teal-400 text-slate-950 shadow-glow-cyan hover:from-tezcat-cyanHover hover:to-teal-300'
                    : destino === 'EN_PROCESO'
                      ? 'border-tezcat-cyan/50 bg-tezcat-cyan/10 text-tezcat-cyan hover:bg-tezcat-cyan/20'
                      : 'border-tezcat-borderHighlight bg-tezcat-surfaceAlt text-tezcat-textPrimary hover:border-tezcat-cyan/50'}"
              >
                <span class="material-symbols-outlined text-lg">{iconoBoton[destino] ?? 'sync_alt'}</span>
                {textoBoton(destino)}
              </button>
            </form>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Contenido -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Columna principal -->
      <div class="space-y-6 lg:col-span-2">
        <Panel titulo="Descripción">
          {#if data.tarea.descripcion}
            <p class="text-sm leading-relaxed whitespace-pre-line text-tezcat-textSecondary">{data.tarea.descripcion}</p>
          {:else}
            <p class="text-sm text-tezcat-textMuted">Sin descripción.</p>
          {/if}
        </Panel>

        <Panel titulo="Criterios de aceptación" descripcion="Condiciones verificables para dar la tarea por terminada.">
          {#if data.criterios.length === 0}
            <p class="text-sm text-tezcat-textMuted">Esta tarea no tiene criterios.</p>
          {:else}
            <ul class="space-y-2.5">
              {#each data.criterios as c (c.id)}
                <li class="flex items-start gap-3 rounded-lg border border-tezcat-border bg-tezcat-bg px-3.5 py-2.5 text-sm">
                  <span class="material-symbols-outlined mt-0.5 text-lg {c.completado ? 'text-emerald-300' : 'text-tezcat-textMuted'}">
                    {c.completado ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span class="{c.completado ? 'text-tezcat-textMuted line-through' : ''}">{c.descripcion}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </Panel>

        <Panel titulo="Historial">
          {#if data.eventos.length === 0}
            <p class="text-sm text-tezcat-textMuted">Sin eventos registrados.</p>
          {:else}
            <ol class="relative space-y-5 border-l border-tezcat-border pl-5">
              {#each data.eventos as e (e.id)}
                <li class="relative">
                  <span class="absolute top-0.5 -left-[26px] flex size-3 items-center justify-center rounded-full bg-tezcat-bg ring-4 ring-tezcat-bg">
                    <span class="size-2 rounded-full bg-tezcat-cyan"></span>
                  </span>
                  <p class="flex items-center gap-2 text-sm font-semibold">
                    <span class="material-symbols-outlined text-base text-tezcat-cyan">{iconoEvento[e.tipo] ?? 'info'}</span>
                    {textoEvento(e)}
                  </p>
                  <p class="mt-0.5 text-xs text-tezcat-textSecondary">
                    {fecha(e.creadoEn)}{e.actorNombre ? ` · ${e.actorNombre}` : ''}
                  </p>
                </li>
              {/each}
            </ol>
          {/if}
        </Panel>
      </div>

      <!-- Columna lateral -->
      <div class="space-y-6">
        <Panel titulo="Detalles">
          <dl class="space-y-4 text-sm">
            <div>
              <dt class={etiqueta}>Responsable</dt>
              <dd class="mt-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tezcat-textMuted">person</span>
                {data.responsable?.nombre ?? 'Sin asignar'}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Revisor</dt>
              <dd class="mt-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tezcat-textMuted">rate_review</span>
                {data.revisor?.nombre ?? 'Sin revisor'}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Creada por</dt>
              <dd class="mt-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tezcat-textMuted">history_edu</span>
                {data.creador?.nombre ?? '—'}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Proyecto</dt>
              <dd class="mt-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tezcat-textMuted">folder</span>
                {data.proyecto?.nombre ?? 'Sin proyecto'}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Fecha límite</dt>
              <dd class="mt-1 flex items-center gap-2 {vencida ? 'font-semibold text-red-300' : ''}">
                <span class="material-symbols-outlined text-base {vencida ? 'text-red-400' : 'text-tezcat-textMuted'}">
                  {vencida ? 'warning' : 'event'}
                </span>
                {fecha(data.tarea.fechaLimite)}
                {#if vencida}<span class="font-mono text-[10px] tracking-wider uppercase">Vencida</span>{/if}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Prioridad / Dificultad</dt>
              <dd class="mt-1.5 flex flex-wrap gap-1.5">
                <span class="rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase {clasePrioridad[data.tarea.prioridad ?? ''] ?? 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary'}">
                  {data.tarea.prioridad ?? '—'}
                </span>
                <span class="rounded-md border border-tezcat-border bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
                  {data.tarea.dificultad ?? '—'}
                </span>
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Creada</dt>
              <dd class="mt-1 text-tezcat-textSecondary">{fecha(data.tarea.creadoEn)}</dd>
            </div>
            <div>
              <dt class={etiqueta}>Última actualización</dt>
              <dd class="mt-1 text-tezcat-textSecondary">{fecha(data.tarea.actualizadoEn)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel titulo="Archivos">
          {#if data.archivos.length === 0}
            <div class="flex items-start gap-2.5 text-sm text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg">attach_file</span>
              <span>Sin archivos adjuntos. Disponible en un sprint próximo.</span>
            </div>
          {:else}
            <ul class="space-y-2 text-sm">
              {#each data.archivos as a (a.id)}
                <li class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-tezcat-textMuted">draft</span>
                  {a.nombre}
                </li>
              {/each}
            </ul>
          {/if}
        </Panel>
      </div>
    </div>
  </main>
</div>