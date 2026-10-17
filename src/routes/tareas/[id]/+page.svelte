<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const flujoEstados = ['ASIGNADA', 'EN_PROCESO', 'EN_REVISION', 'TERMINADA'];
  const indiceEstado = $derived(flujoEstados.indexOf(data.tarea.estado));

  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada',
    EN_PROCESO: 'En proceso',
    EN_REVISION: 'En revisión',
    TERMINADA: 'Terminada'
  };

  const claseEstado: Record<string, string> = {
    ASIGNADA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    EN_PROCESO: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    EN_REVISION: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
    TERMINADA: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
  };

  const iconoEstado: Record<string, string> = {
    ASIGNADA: 'assignment_ind',
    EN_PROCESO: 'progress_activity',
    EN_REVISION: 'rate_review',
    TERMINADA: 'task_alt'
  };

  const clasePrioridad: Record<string, string> = {
    BAJA: 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary',
    MEDIA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    ALTA: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    URGENTE: 'border-red-400/40 bg-red-400/10 text-red-300'
  };

  const iconoBoton: Record<string, string> = {
    EN_PROCESO: 'play_arrow',
    EN_REVISION: 'rate_review',
    TERMINADA: 'task_alt'
  };

  const iconoEvento: Record<string, string> = {
    TAREA_CREADA: 'add_task',
    CAMBIO_ESTADO: 'sync_alt'
  };

  function textoBoton(destino: string): string {
    if (destino === 'EN_PROCESO') {
      return data.tarea.estado === 'EN_REVISION' ? 'Devolver a en proceso' : 'Iniciar tarea';
    }
    if (destino === 'EN_REVISION') return 'Enviar a revisión';
    if (destino === 'TERMINADA') return 'Marcar como terminada';
    return textoEstado[destino] ?? destino;
  }

  const fecha = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha';

  function textoEvento(e: (typeof data.eventos)[number]): string {
    const detalle = e.detalle as { de?: string; a?: string } | null;
    if (e.tipo === 'CAMBIO_ESTADO' && detalle?.de && detalle?.a) {
      return `Cambió de ${textoEstado[detalle.de] ?? detalle.de} a ${textoEstado[detalle.a] ?? detalle.a}`;
    }
    if (e.tipo === 'TAREA_CREADA') return 'Tarea creada';
    return e.tipo;
  }

  function formatearBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return 'Enlace externo';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  const vencida = $derived(
    data.tarea.estado !== 'TERMINADA' && new Date(data.tarea.fechaLimite).getTime() < Date.now()
  );

  // =========================================================================
  // LÓGICA TW-07: Progreso del Checklist (Responsable vs. Encargado)
  // =========================================================================
  const totalCriterios = $derived(data.criterios.length);
  const criteriosCompletados = $derived(data.criterios.filter((c) => c.completado).length);
  const criteriosVerificados = $derived(data.criterios.filter((c) => c.verificadoEncargado).length);

  const porcentajeCompletado = $derived(
    totalCriterios === 0 ? 100 : Math.round((criteriosCompletados / totalCriterios) * 100)
  );
  const porcentajeVerificado = $derived(
    totalCriterios === 0 ? 100 : Math.round((criteriosVerificados / totalCriterios) * 100)
  );

  const esResponsable = $derived(data.user.id === data.responsable?.id || data.user.rol === 'MIEMBRO');
  const esEncargadoORevisor = $derived(data.user.rol === 'ENCARGADO' || data.user.id === data.revisor?.id);
  const puedeEliminar = $derived(
    data.user.rol === 'ADMIN' ||
    (data.user.rol === 'ENCARGADO' && data.user.departamentoId === data.tarea.departamentoId) ||
    data.user.id === data.creador?.id
  );

  // El responsable marca avance durante ASIGNADA o EN_PROCESO
  const puedeMarcarAvance = $derived(
    (esResponsable || esEncargadoORevisor) &&
      (data.tarea.estado === 'ASIGNADA' || data.tarea.estado === 'EN_PROCESO')
  );

  // El encargado verifica de forma independiente durante EN_REVISION
  const puedeVerificarRevision = $derived(esEncargadoORevisor && data.tarea.estado === 'EN_REVISION');

  function transicionBloqueada(destino: string): { bloqueado: boolean; motivo: string } {
    if (destino === 'EN_REVISION' && porcentajeCompletado < 100) {
      return {
        bloqueado: true,
        motivo: `Completa los ${totalCriterios - criteriosCompletados} criterios pendientes antes de solicitar revisión.`
      };
    }
    if (destino === 'TERMINADA' && porcentajeVerificado < 100) {
      return {
        bloqueado: true,
        motivo: `Verifica manualmente los ${totalCriterios - criteriosVerificados} criterios pendientes para aprobar la tarea.`
      };
    }
    return { bloqueado: false, motivo: '' };
  }

  // =========================================================================
  // LÓGICA TW-08: Gestión de Evidencias y Recursos
  // =========================================================================
  let modoAdjunto = $state<'ARCHIVO' | 'ENLACE'>('ARCHIVO');
  let subiendoArchivo = $state(false);
  let archivosParaSubir = $state<File[]>([]);
  let inputEvidenciaRef = $state<HTMLInputElement | null>(null);

  function seleccionarEvidencias(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (!input.files) return;
    archivosParaSubir = Array.from(input.files);
  }

  // =========================================================================
  // LÓGICA TW-09: Conversación Contextual
  // =========================================================================
  let nuevoComentario = $state('');
  let enviandoComentario = $state(false);
  let contenedorChatRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const _total = data.comentarios?.length ?? 0;
    if (contenedorChatRef && _total > 0) {
      contenedorChatRef.scrollTop = contenedorChatRef.scrollHeight;
    }
  });

  $effect(() => {
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') {
        invalidateAll();
      }
    }, 12_000);
    return () => clearInterval(intervalo);
  });

  const etiqueta = 'font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';
  let enviando = $state(false);
</script>

<svelte:head><title>{data.tarea.titulo} | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
    <!-- Encabezado superior con botón de volver y botón de eliminación -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <a
        href="/tareas"
        class="inline-flex items-center gap-1 text-xs font-semibold text-tezcat-cyan transition-colors hover:text-tezcat-cyanHover"
      >
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Volver a tareas
      </a>

      <!-- Botón de eliminación con confirmación (solo visible para Encargado / Creador / Admin) -->
      {#if puedeEliminar}
        <form
          method="POST"
          action="?/eliminarTarea"
          use:enhance={({ cancel }) => {
            const confirmar = confirm(
              `¿Estás seguro de que deseas eliminar permanentemente la tarea "${data.tarea.titulo}"?\n\nEsta acción eliminará todos sus criterios, archivos adjuntos en disco y mensajes del chat sin posibilidad de recuperarlos.`
            );
            if (!confirmar) cancel();
          }}
        >
          <button
            type="submit"
            class="inline-flex items-center gap-1.5 rounded-xl border border-tezcat-danger/40 bg-tezcat-danger/10 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-red-300 uppercase transition-all hover:border-tezcat-danger/70 hover:bg-tezcat-danger/20 active:scale-95"
            title="Eliminar tarea permanentemente"
          >
            <span class="material-symbols-outlined text-sm text-red-400">delete_forever</span>
            Eliminar tarea
          </button>
        </form>
      {/if}
    </div>

    <!-- Título y estados -->
    <div>
      <div class="flex flex-wrap items-center gap-2">
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

    <!-- Alertas y mensajes -->
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

    <!-- Acciones de transición de estado (TW-05 y TW-07) -->
    {#if data.transicionesPermitidas.length > 0}
      <section class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-2xl backdrop-blur-md">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class={etiqueta}>Actualizar avance</p>
          {#if data.tarea.estado === 'EN_PROCESO' && porcentajeCompletado < 100}
            <span class="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300">
              <span class="material-symbols-outlined text-sm">info</span>
              Marca el 100% del checklist ({criteriosCompletados}/{totalCriterios}) para solicitar revisión
            </span>
          {:else if data.tarea.estado === 'EN_REVISION' && esEncargadoORevisor && porcentajeVerificado < 100}
            <span class="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300">
              <span class="material-symbols-outlined text-sm">fact_check</span>
              Verifica manualmente los criterios ({criteriosVerificados}/{totalCriterios}) antes de aprobar
            </span>
          {/if}
        </div>

        <div class="mt-3 flex flex-wrap gap-3">
          {#each data.transicionesPermitidas as destino (destino)}
            {@const candado = transicionBloqueada(destino)}
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
                disabled={enviando || candado.bloqueado}
                title={candado.bloqueado ? candado.motivo : ''}
                class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45
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

    <!-- Contenedor en 2 columnas -->
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

        <!-- TW-07: Checklist de Criterios -->
        <Panel
          titulo="Criterios de aceptación (Checklist · TW-07)"
          descripcion={puedeVerificarRevision
            ? 'Modo revisor: verifica manualmente cada criterio conforme compruebes su cumplimiento antes de aprobar.'
            : 'Marca cada condición conforme avances para habilitar el envío a revisión.'}
        >
          {#if data.criterios.length === 0}
            <p class="text-sm text-tezcat-textMuted">Esta tarea no tiene criterios registrados.</p>
          {:else}
            <!-- Barra de progreso -->
            <div class="mb-4 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5">
              <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <span class="text-tezcat-textSecondary uppercase">
                  Avance del Miembro: <strong class="text-tezcat-cyan">{criteriosCompletados}/{totalCriterios}</strong> ({porcentajeCompletado}%)
                </span>
                {#if data.tarea.estado === 'EN_REVISION' || data.tarea.estado === 'TERMINADA'}
                  <span class="text-violet-300 uppercase">
                    Verificación encargado: <strong>{criteriosVerificados}/{totalCriterios}</strong> ({porcentajeVerificado}%)
                  </span>
                {/if}
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
                <div
                  class="h-full bg-linear-to-r from-tezcat-cyan to-emerald-400 transition-all duration-300"
                  style="width: {data.tarea.estado === 'EN_REVISION' || data.tarea.estado === 'TERMINADA' ? porcentajeVerificado : porcentajeCompletado}%"
                ></div>
              </div>
            </div>

            <ul class="space-y-2.5">
              {#each data.criterios as c (c.id)}
                <li class="flex flex-col justify-between gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg px-3.5 py-3 text-sm sm:flex-row sm:items-center">
                  <!-- Check de avance (Responsable) -->
                  <form method="POST" action="?/toggleCriterio" use:enhance class="flex min-w-0 flex-1 items-start gap-3">
                    <input type="hidden" name="criterioId" value={c.id} />
                    <input type="hidden" name="modo" value="RESPONSABLE" />
                    <button
                      type="submit"
                      disabled={!puedeMarcarAvance}
                      title={puedeMarcarAvance
                        ? 'Haz clic para marcar o desmarcar este criterio'
                        : 'El avance solo se modifica en estado Asignada o En proceso'}
                      class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-default
                        {c.completado
                          ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                          : 'border-tezcat-border bg-tezcat-surfaceAlt text-transparent hover:border-tezcat-cyan'}"
                    >
                      <span class="material-symbols-outlined text-sm">check</span>
                    </button>
                    <span class="leading-snug {c.completado ? 'text-tezcat-textMuted line-through' : 'text-tezcat-textPrimary'}">
                      {c.descripcion}
                    </span>
                  </form>

                  <!-- Check de verificación independiente (Encargado en revisión) -->
                  {#if data.tarea.estado === 'EN_REVISION' || data.tarea.estado === 'TERMINADA'}
                    <form method="POST" action="?/toggleCriterio" use:enhance class="shrink-0">
                      <input type="hidden" name="criterioId" value={c.id} />
                      <input type="hidden" name="modo" value="ENCARGADO" />
                      <button
                        type="submit"
                        disabled={!puedeVerificarRevision}
                        title={puedeVerificarRevision
                          ? 'Verificar cumplimiento de este criterio'
                          : 'Solo el encargado o revisor puede verificar en estado En revisión'}
                        class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase transition-colors disabled:cursor-default
                          {c.verificadoEncargado
                            ? 'border-violet-400/50 bg-violet-400/15 text-violet-300'
                            : 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textMuted hover:border-violet-400/40 hover:text-violet-300'}"
                      >
                        <span class="material-symbols-outlined text-sm">
                          {c.verificadoEncargado ? 'verified' : 'fact_check'}
                        </span>
                        {c.verificadoEncargado ? 'Verificado' : 'Verificar (Encargado)'}
                      </button>
                    </form>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </Panel>

        <!-- TW-09: Conversación de la tarea -->
        <div id="conversacion">
          <Panel
            titulo="Chat"
            descripcion="Comunicación directa entre Miembro y Encargado vinculada a esta asignación."
          >
            <div
              bind:this={contenedorChatRef}
              class="max-h-96 space-y-3.5 overflow-y-auto rounded-xl border border-tezcat-border bg-tezcat-bg p-4"
            >
              {#if !data.comentarios || data.comentarios.length === 0}
                <div class="flex flex-col items-center justify-center py-8 text-center text-tezcat-textMuted">
                  <span class="material-symbols-outlined text-3xl text-tezcat-cyan/60">forum</span>
                  <p class="mt-2 text-xs font-semibold text-tezcat-textSecondary">
                    Aún no hay mensajes en esta tarea
                  </p>
                  <p class="mt-0.5 max-w-sm text-[11px]">
                    Escribe un comentario abajo para resolver dudas sobre los criterios, reportar bloqueos o retroalimentar evidencias.
                  </p>
                </div>
              {:else}
                {#each data.comentarios as msg (msg.id)}
                  {@const esMio = msg.autorId === data.user.id}
                  <div class="flex items-start gap-3 {esMio ? 'flex-row-reverse' : ''}">
                    <div
                      class="flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold
                        {msg.autorRol === 'ENCARGADO'
                          ? 'border-tezcat-cyan/40 bg-tezcat-cyan/15 text-tezcat-cyan'
                          : 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary'}"
                    >
                      {iniciales(msg.autorNombre)}
                    </div>

                    <div class="flex max-w-[80%] flex-col {esMio ? 'items-end' : 'items-start'}">
                      <div class="mb-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                        <span class="font-semibold text-tezcat-textPrimary">{msg.autorNombre}</span>
                        <span
                          class="rounded px-1.5 py-0.5 text-[9px] uppercase
                            {msg.autorRol === 'ENCARGADO'
                              ? 'bg-tezcat-cyan/15 text-tezcat-cyan'
                              : 'bg-tezcat-surfaceAlt text-tezcat-textSecondary'}"
                        >
                          {msg.autorRol}
                        </span>
                        <span class="text-tezcat-textMuted">· {fecha(msg.creadoEn)}</span>
                      </div>

                      <div
                        class="rounded-2xl border px-4 py-2.5 text-sm leading-relaxed
                          {esMio
                            ? 'rounded-tr-xs border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-textPrimary'
                            : 'rounded-tl-xs border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textPrimary'}"
                      >
                        <p class="whitespace-pre-line">{msg.contenido}</p>
                      </div>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Redactar mensaje -->
            <form
              method="POST"
              action="?/comentar"
              class="mt-3 space-y-2"
              use:enhance={() => {
                enviandoComentario = true;
                return async ({ update }) => {
                  enviandoComentario = false;
                  nuevoComentario = '';
                  await update();
                };
              }}
            >
              <div class="flex items-end gap-2.5">
                <textarea
                  name="contenido"
                  rows="2"
                  required
                  maxlength="2000"
                  bind:value={nuevoComentario}
                  onkeydown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && nuevoComentario.trim()) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Escribe un mensaje para la tarea… (Ctrl + Enter para enviar)"
                  class="flex-1 resize-y rounded-xl border border-tezcat-border bg-tezcat-bg px-3.5 py-2.5 text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none"
                ></textarea>
                <button
                  type="submit"
                  disabled={enviandoComentario || !nuevoComentario.trim()}
                  class="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 disabled:opacity-45"
                >
                  <span class="material-symbols-outlined text-base">send</span>
                  Enviar
                </button>
              </div>
            </form>
          </Panel>
        </div>

        <!-- Historial de eventos -->
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
              <dt class={etiqueta}>Miembro</dt>
              <dd class="mt-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-tezcat-textMuted">person</span>
                {data.responsable?.nombre ?? 'Sin asignar'}
              </dd>
            </div>
            <div>
              <dt class={etiqueta}>Encargado</dt>
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

        <!-- TW-08: Archivos y Evidencias -->
        <Panel
          titulo="Archivos De La Tarea"
          descripcion="Materiales guía del encargado y entregables de evidencia del Miembro."
        >
          {#if data.archivos.length === 0}
            <div class="mb-4 flex items-start gap-2.5 rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-3.5 text-xs text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg text-tezcat-cyan">attach_file</span>
              <span>No hay archivos ni evidencias adjuntas en esta tarea todavía.</span>
            </div>
          {:else}
            <ul class="mb-4 space-y-2.5 text-xs">
              {#each data.archivos as a (a.id)}
                <li class="rounded-xl border border-tezcat-border bg-tezcat-bg p-3">
                  <div class="flex items-start justify-between gap-2">
                    <a
                      href={a.urlDescarga ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="group flex min-w-0 items-start gap-2"
                    >
                      <span class="material-symbols-outlined mt-0.5 text-base text-tezcat-cyan">
                        {a.mimeType === 'text/uri-list' ? 'link' : 'description'}
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-tezcat-textPrimary group-hover:text-tezcat-cyan group-hover:underline">
                          {a.nombre}
                        </p>
                        <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                          {formatearBytes(a.tamanoBytes)} · {a.subidoPorNombre ?? 'Usuario'}
                        </p>
                      </div>
                    </a>

                    <!-- Eliminar archivo (solo autor o encargado) -->
                    {#if data.user.rol === 'ENCARGADO' || data.user.id === a.subidoPorId || data.user.rol === 'ADMIN'}
                      <form method="POST" action="?/eliminarArchivo" use:enhance>
                        <input type="hidden" name="archivoId" value={a.id} />
                        <button
                          type="submit"
                          title="Eliminar archivo"
                          class="rounded p-1 text-tezcat-textMuted transition-colors hover:bg-tezcat-danger/15 hover:text-red-300"
                        >
                          <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </form>
                    {/if}
                  </div>

                  <div class="mt-2 flex items-center justify-between border-t border-tezcat-border/60 pt-1.5 font-mono text-[9px] uppercase">
                    <span
                      class="rounded px-1.5 py-0.5 font-semibold
                        {a.categoria === 'RECURSO_GUIA'
                          ? 'bg-tezcat-cyan/15 text-tezcat-cyan'
                          : 'bg-emerald-400/15 text-emerald-300'}"
                    >
                      {a.categoria === 'RECURSO_GUIA' ? 'Recurso Guía (Encargado)' : 'Evidencia (Responsable)'}
                    </span>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}

          <!-- Selector y formulario para subir evidencias -->
          {#if data.tarea.estado !== 'TERMINADA'}
            <div class="space-y-3 border-t border-tezcat-border pt-3">
              <div class="grid grid-cols-2 gap-1 rounded-lg bg-tezcat-bg p-1 font-mono text-[10px]">
                <button
                  type="button"
                  onclick={() => (modoAdjunto = 'ARCHIVO')}
                  class="rounded-md py-1.5 font-semibold uppercase transition-colors
                    {modoAdjunto === 'ARCHIVO'
                      ? 'bg-tezcat-surfaceAlt text-tezcat-cyan'
                      : 'text-tezcat-textMuted hover:text-tezcat-textPrimary'}"
                >
                  Subir archivo
                </button>
                <button
                  type="button"
                  onclick={() => (modoAdjunto = 'ENLACE')}
                  class="rounded-md py-1.5 font-semibold uppercase transition-colors
                    {modoAdjunto === 'ENLACE'
                      ? 'bg-tezcat-surfaceAlt text-tezcat-cyan'
                      : 'text-tezcat-textMuted hover:text-tezcat-textPrimary'}"
                >
                  Enlace externo
                </button>
              </div>

              <form
                method="POST"
                action="?/subirArchivo"
                enctype="multipart/form-data"
                class="space-y-2.5"
                use:enhance={() => {
                  subiendoArchivo = true;
                  return async ({ update }) => {
                    subiendoArchivo = false;
                    archivosParaSubir = [];
                    if (inputEvidenciaRef) inputEvidenciaRef.value = '';
                    await update();
                  };
                }}
              >
                {#if modoAdjunto === 'ARCHIVO'}
                  <label
                    for="inputEvidencias"
                    class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg p-3.5 text-center transition-colors hover:border-tezcat-cyan/50"
                  >
                    <span class="material-symbols-outlined text-2xl text-tezcat-cyan">cloud_upload</span>
                    <span class="mt-1 text-xs font-semibold text-tezcat-textPrimary">
                      {data.user.rol === 'ENCARGADO' ? 'Adjuntar recurso guía' : 'Subir archivo de evidencia'}
                    </span>
                    <span class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">Máx. 10 MB por archivo</span>
                    <input
                      bind:this={inputEvidenciaRef}
                      id="inputEvidencias"
                      name="archivos"
                      type="file"
                      multiple
                      onchange={seleccionarEvidencias}
                      class="sr-only"
                    />
                  </label>

                  {#if archivosParaSubir.length > 0}
                    <ul class="space-y-1 text-[11px] text-tezcat-textSecondary">
                      {#each archivosParaSubir as f (f.name)}
                        <li class="flex items-center justify-between truncate rounded bg-tezcat-surfaceAlt px-2 py-1">
                          <span class="truncate">{f.name}</span>
                          <span class="font-mono text-[10px] text-tezcat-cyan">{formatearBytes(f.size)}</span>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                {:else}
                  <input
                    type="text"
                    name="enlaceTitulo"
                    maxlength="120"
                    placeholder="Nombre del recurso (ej. Carpeta de Drive)"
                    class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg px-3 py-2 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
                  />
                  <input
                    type="url"
                    name="enlaceUrl"
                    required
                    placeholder="https://..."
                    class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg px-3 py-2 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
                  />
                {/if}

                <button
                  type="submit"
                  disabled={subiendoArchivo || (modoAdjunto === 'ARCHIVO' && archivosParaSubir.length === 0)}
                  class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-3 py-2 text-xs font-semibold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20 disabled:opacity-40"
                >
                  <span class="material-symbols-outlined text-sm">
                    {subiendoArchivo ? 'sync' : 'upload'}
                  </span>
                  {subiendoArchivo
                    ? 'Adjuntando…'
                    : data.user.rol === 'ENCARGADO'
                      ? 'Guardar recurso en la tarea'
                      : 'Adjuntar evidencia'}
                </button>
              </form>
            </div>
          {/if}
        </Panel>
      </div>
    </div>
  </main>
</div>