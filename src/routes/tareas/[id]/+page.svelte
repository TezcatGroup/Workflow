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

  // =========================================================================
  // LÓGICA TW-10 y TW-11: Formateadores de Eventos Centrales dentro del Chat
  // =========================================================================
  type EventoItem = Extract<(typeof data.timeline)[number], { tipoItem: 'EVENTO' }>;

  function textoEvento(e: EventoItem): string {
    const detalle = e.detalle as {
      de?: string;
      a?: string;
      nombre?: string;
      esEnlace?: boolean;
      nuevoResponsableNombre?: string;
    } | null;

    if (e.tipo === 'TAREA_CREADA') {
      return 'Tarea creada';
    }
    if (e.tipo === 'CAMBIO_ESTADO' && detalle?.de && detalle?.a) {
      if (detalle.de === 'EN_REVISION' && detalle.a === 'EN_PROCESO') {
        return 'Se devolvió la tarea a En proceso';
      }
      if (detalle.a === 'EN_PROCESO') {
        return 'Inició la tarea (En proceso)';
      }
      if (detalle.a === 'EN_REVISION') {
        return 'Envió la tarea a revisión';
      }
      if (detalle.a === 'TERMINADA') {
        return 'Tarea aprobada y terminada';
      }
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
    if (e.tipo === 'SOLICITUD_REASIGNACION') {
      return 'Solicitó cambio de asignación de la tarea';
    }
    if (e.tipo === 'REASIGNACION_APROBADA') {
      return `Reasignación aprobada · Nuevo responsable: ${detalle?.nuevoResponsableNombre ?? 'integrante'}`;
    }
    if (e.tipo === 'REASIGNACION_RECHAZADA') {
      return 'Solicitud de cambio de asignación denegada';
    }
    return e.tipo;
  }

  function iconoEvento(e: EventoItem): string {
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

  function claseEvento(e: EventoItem): string {
    const detalle = e.detalle as { de?: string; a?: string } | null;
    if (e.tipo === 'TAREA_CREADA') {
      return 'border-tezcat-cyan/30 bg-tezcat-cyan/10 text-tezcat-cyan';
    }
    if (e.tipo === 'CAMBIO_ESTADO') {
      if (detalle?.de === 'EN_REVISION' && detalle?.a === 'EN_PROCESO') {
        return 'border-amber-400/35 bg-amber-400/10 text-amber-300';
      }
      if (detalle?.a === 'EN_REVISION') {
        return 'border-violet-400/35 bg-violet-400/10 text-violet-300';
      }
      if (detalle?.a === 'TERMINADA') {
        return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300';
      }
    }
    if (e.tipo === 'ARCHIVO_ELIMINADO' || e.tipo === 'REASIGNACION_RECHAZADA') {
      return 'border-red-400/30 bg-red-400/10 text-red-300';
    }
    if (e.tipo === 'SOLICITUD_REASIGNACION') {
      return 'border-amber-400/35 bg-amber-400/10 text-amber-300';
    }
    if (e.tipo === 'REASIGNACION_APROBADA') {
      return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300';
    }
    return 'border-tezcat-border/80 bg-tezcat-surfaceAlt/60 text-tezcat-textSecondary';
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
  // LÓGICA TW-07 y TW-11: Progreso del Checklist y Permisos de Reasignación
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

  const reasignadaDelUsuario = $derived(Boolean(data.reasignadaDelUsuario));
  const esResponsableActual = $derived(data.user.id === data.responsable?.id);
  const esEncargadoORevisor = $derived(data.user.rol === 'ENCARGADO' || data.user.id === data.revisor?.id);
  const puedeEliminar = $derived(
    !reasignadaDelUsuario &&
      (data.user.rol === 'ADMIN' ||
        (data.user.rol === 'ENCARGADO' && data.user.departamentoId === data.tarea.departamentoId) ||
        data.user.id === data.creador?.id)
  );

  const puedeMarcarAvance = $derived(
    !reasignadaDelUsuario &&
      (esResponsableActual || esEncargadoORevisor) &&
      (data.tarea.estado === 'ASIGNADA' || data.tarea.estado === 'EN_PROCESO')
  );

  const puedeVerificarRevision = $derived(
    !reasignadaDelUsuario && esEncargadoORevisor && data.tarea.estado === 'EN_REVISION'
  );

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
  // LÓGICA TW-11: Estados del Formulario de Solicitud y Resolución de Cambio
  // =========================================================================
  let mostrarFormularioSolicitud = $state(false);
  let motivoSolicitud = $state('');
  let enviandoSolicitud = $state(false);

  let modoResolucionEncargado = $state<'APROBAR' | 'DECLINAR'>('APROBAR');
  let nuevoResponsableId = $state('');
  let motivoRechazo = $state('');
  let enviandoResolucion = $state(false);

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
  // LÓGICA TW-09 y TW-10: Conversación Contextual con Timeline Unificado
  // =========================================================================
  let nuevoComentario = $state('');
  let enviandoComentario = $state(false);
  let contenedorChatRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const _totalItems = data.timeline?.length ?? 0;
    if (contenedorChatRef && _totalItems > 0) {
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
        {#if reasignadaDelUsuario}
          <span class="inline-flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-400/15 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-amber-300 uppercase">
            <span class="material-symbols-outlined text-sm">swap_horiz</span>
            Reasignada
          </span>
        {:else}
          <span class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase {claseEstado[data.tarea.estado] ?? ''}">
            <span class="material-symbols-outlined text-sm">{iconoEstado[data.tarea.estado] ?? 'label'}</span>
            {textoEstado[data.tarea.estado] ?? data.tarea.estado}
          </span>
        {/if}
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

    <!-- TW-11: Aviso Automático de Bloqueo para el Miembro al que se le quitó la tarea -->
    {#if reasignadaDelUsuario}
      <div
        role="status"
        class="flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm text-amber-200 shadow-lg"
      >
        <span class="material-symbols-outlined mt-0.5 shrink-0 text-xl text-amber-300">verified_user</span>
        <div>
          <p class="font-bold text-amber-300">
            Se ha validado la reasignación de la actividad que se le había imputado.
          </p>
          <p class="mt-1 text-xs text-amber-200/80">
            Esta tarea fue asignada a <strong>{data.responsable?.nombre ?? 'otro integrante'}</strong>. Tu acceso a esta actividad ahora es únicamente informativo y no puedes realizar acciones en el checklist, archivos ni chat.
          </p>
        </div>
      </div>
    {/if}

    <!-- Alertas y mensajes de formularios -->
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

    <!-- =============================================================== -->
    <!-- TW-11: PANEL EXCLUSIVO DEL ENCARGADO PARA RESOLVER REASIGNACIÓN -->
    <!-- =============================================================== -->
    {#if esEncargadoORevisor && data.solicitudPendiente}
      <section class="rounded-2xl border border-amber-400/50 bg-tezcat-card/95 p-5 shadow-2xl backdrop-blur-md">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined mt-0.5 text-2xl text-amber-300">swap_horiz</span>
            <div>
              <p class="font-mono text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                TW-11 · Solicitud de cambio de asignación pendiente
              </p>
              <h2 class="mt-0.5 text-base font-bold text-white">
                {data.solicitudPendiente.solicitanteNombre} solicita transferir esta tarea
              </h2>
              <p class="mt-1 text-xs text-tezcat-textSecondary">
                Solicitada el {fecha(data.solicitudPendiente.creadaEn)}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 text-xs">
          <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textMuted uppercase">
            Motivo del miembro:
          </p>
          <p class="mt-1 leading-relaxed whitespace-pre-line text-tezcat-textPrimary">
            "{data.solicitudPendiente.motivo}"
          </p>
        </div>

        <!-- Pestañas: Aprobar y Reasignar vs Declinar Solicitud -->
        <div class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-tezcat-bg p-1 font-mono text-xs">
          <button
            type="button"
            onclick={() => (modoResolucionEncargado = 'APROBAR')}
            class="flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold uppercase transition-colors
              {modoResolucionEncargado === 'APROBAR'
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                : 'text-tezcat-textMuted hover:text-tezcat-textPrimary'}"
          >
            <span class="material-symbols-outlined text-base">how_to_reg</span>
            Aprobar y reasignar
          </button>
          <button
            type="button"
            onclick={() => (modoResolucionEncargado = 'DECLINAR')}
            class="flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold uppercase transition-colors
              {modoResolucionEncargado === 'DECLINAR'
                ? 'bg-red-400/20 text-red-300 border border-red-400/40'
                : 'text-tezcat-textMuted hover:text-tezcat-textPrimary'}"
          >
            <span class="material-symbols-outlined text-base">block</span>
            Declinar cambio
          </button>
        </div>

        <form
          method="POST"
          action="?/resolverReasignacion"
          class="mt-4 space-y-3"
          use:enhance={() => {
            enviandoResolucion = true;
            return async ({ update }) => {
              enviandoResolucion = false;
              motivoRechazo = '';
              nuevoResponsableId = '';
              await update();
            };
          }}
        >
          <input type="hidden" name="decision" value={modoResolucionEncargado} />

          {#if modoResolucionEncargado === 'APROBAR'}
            <div>
              <label for="nuevoResponsableId" class={etiqueta}>
                Selecciona al nuevo trabajador responsable *
              </label>
              <select
                id="nuevoResponsableId"
                name="nuevoResponsableId"
                required
                bind:value={nuevoResponsableId}
                class="mt-1.5 w-full rounded-xl border border-tezcat-border bg-tezcat-bg px-3.5 py-2.5 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
              >
                <option value="">Selecciona a un integrante de tu departamento…</option>
                {#each data.miembrosParaReasignar ?? [] as m (m.id)}
                  <option value={m.id}>{m.nombre} ({m.rol})</option>
                {/each}
              </select>
              <p class="mt-1.5 text-[11px] text-tezcat-textMuted">
                Al aprobar, {data.solicitudPendiente.solicitanteNombre} verá la tarea como "Reasignada" y ya no podrá usar el chat ni modificar archivos.
              </p>
            </div>

            <button
              type="submit"
              disabled={enviandoResolucion || !nuevoResponsableId}
              class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:opacity-95 disabled:opacity-45"
            >
              <span class="material-symbols-outlined text-base">check_circle</span>
              Confirmar reasignación
            </button>
          {:else}
            <div>
              <label for="motivoRechazo" class={etiqueta}>
                Explica por qué no se puede cambiar la asignación (se enviará al chat) *
              </label>
              <textarea
                id="motivoRechazo"
                name="motivoRechazo"
                rows="2"
                required
                maxlength="1000"
                bind:value={motivoRechazo}
                placeholder="Escribe el motivo por el cual se deniega el cambio…"
                class="mt-1.5 w-full rounded-xl border border-tezcat-border bg-tezcat-bg px-3.5 py-2 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-red-400 focus:outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={enviandoResolucion || !motivoRechazo.trim()}
              class="inline-flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-400/15 px-4 py-2.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-400/25 disabled:opacity-45"
            >
              <span class="material-symbols-outlined text-base">cancel</span>
              Denegar solicitud y enviar motivo al chat
            </button>
          {/if}
        </form>
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

        <!-- =============================================================== -->
        <!-- TW-07: Checklist de Criterios + Botones de Avance en el mismo recuadro -->
        <!-- =============================================================== -->
        <Panel
          titulo="Checklist"
          descripcion={puedeVerificarRevision
            ? 'Modo revisor: verifica manualmente cada criterio conforme compruebes su cumplimiento antes de aprobar.'
            : 'Marca cada condición conforme avances para habilitar el envío a revisión.'}
        >
          {#if data.criterios.length === 0}
            <p class="text-sm text-tezcat-textMuted">Esta tarea no tiene criterios registrados.</p>
          {:else}
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

          <!-- Botones de avance y envío integrados en la parte inferior del mismo Checklist -->
          {#if data.transicionesPermitidas.length > 0 && !reasignadaDelUsuario}
            <div class="mt-5 border-t border-tezcat-border pt-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span class={etiqueta}>Acción de entrega / estado</span>
                {#if data.tarea.estado === 'EN_PROCESO' && porcentajeCompletado < 100}
                  <span class="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300">
                    <span class="material-symbols-outlined text-sm">info</span>
                    Marca el 100% del checklist ({criteriosCompletados}/{totalCriterios}) para habilitar el envío a revisión
                  </span>
                {:else if data.tarea.estado === 'EN_REVISION' && esEncargadoORevisor && porcentajeVerificado < 100}
                  <span class="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300">
                    <span class="material-symbols-outlined text-sm">fact_check</span>
                    Verifica manualmente los criterios ({criteriosVerificados}/{totalCriterios}) antes de aprobar
                  </span>
                {/if}
              </div>

              <div class="flex flex-wrap gap-3">
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
                        {destino === 'TERMINADA' || destino === 'EN_REVISION'
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
            </div>
          {/if}
        </Panel>

        <!-- TW-09 y TW-10: Chat con Timeline de Actividad Integrado -->
        <div id="conversacion">
          <Panel
            titulo="Chat"
            descripcion=""
          >
            <div
              bind:this={contenedorChatRef}
              class="max-h-[28rem] space-y-3.5 overflow-y-auto rounded-xl border border-tezcat-border bg-tezcat-bg p-4"
            >
              {#if !data.timeline || data.timeline.length === 0}
                <div class="flex flex-col items-center justify-center py-8 text-center text-tezcat-textMuted">
                  <span class="material-symbols-outlined text-3xl text-tezcat-cyan/60">forum</span>
                  <p class="mt-2 text-xs font-semibold text-tezcat-textSecondary">
                    Sin actividad ni mensajes registrados
                  </p>
                  <p class="mt-0.5 max-w-sm text-[11px]">
                    Escribe un comentario abajo para resolver dudas sobre los criterios, reportar bloqueos o retroalimentar evidencias.
                  </p>
                </div>
              {:else}
                {#each data.timeline as item (`${item.tipoItem}-${item.id}`)}
                  {#if item.tipoItem === 'EVENTO'}
                    <!-- TW-10: Evento del historial renderizado como mensaje central minimalista -->
                    <div class="my-2 flex items-center justify-center gap-2.5 px-1">
                      <span class="h-px flex-1 bg-tezcat-border/50"></span>
                      <div
                        class="inline-flex max-w-[90%] flex-wrap items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-center font-mono text-[10px] leading-tight
                          {claseEvento(item)}"
                      >
                        <span class="material-symbols-outlined text-xs">{iconoEvento(item)}</span>
                        <span class="font-semibold">{textoEvento(item)}</span>
                        <span class="opacity-75">
                          · {fecha(item.creadoEn)}{item.actorNombre ? ` · ${item.actorNombre}` : ''}
                        </span>
                      </div>
                      <span class="h-px flex-1 bg-tezcat-border/50"></span>
                    </div>
                  {:else}
                    <!-- TW-09: Burbuja de mensaje de conversación -->
                    {@const esMio = item.autorId === data.user.id}
                    <div class="flex items-start gap-3 {esMio ? 'flex-row-reverse' : ''}">
                      <div
                        class="flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold
                          {item.autorRol === 'ENCARGADO'
                            ? 'border-tezcat-cyan/40 bg-tezcat-cyan/15 text-tezcat-cyan'
                            : 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary'}"
                      >
                        {iniciales(item.autorNombre)}
                      </div>

                      <div class="flex max-w-[80%] flex-col {esMio ? 'items-end' : 'items-start'}">
                        <div class="mb-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          <span class="font-semibold text-tezcat-textPrimary">{item.autorNombre}</span>
                          <span
                            class="rounded px-1.5 py-0.5 text-[9px] uppercase
                              {item.autorRol === 'ENCARGADO'
                                ? 'bg-tezcat-cyan/15 text-tezcat-cyan'
                                : 'bg-tezcat-surfaceAlt text-tezcat-textSecondary'}"
                          >
                            {item.autorRol}
                          </span>
                          <span class="text-tezcat-textMuted">· {fecha(item.creadoEn)}</span>
                        </div>

                        <div
                          class="rounded-2xl border px-4 py-2.5 text-sm leading-relaxed
                            {esMio
                              ? 'rounded-tr-xs border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-textPrimary'
                              : 'rounded-tl-xs border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textPrimary'}"
                        >
                          <p class="whitespace-pre-line">{item.contenido}</p>
                        </div>
                      </div>
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>

            <!-- Redactar mensaje (bloqueado si la tarea fue reasignada a otra persona) -->
            {#if reasignadaDelUsuario}
              <div class="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-200">
                <span class="material-symbols-outlined text-base text-amber-300">lock</span>
                <span>
                  Se ha validado la reasignación de esta actividad; el envío de mensajes en el chat está deshabilitado para tu cuenta.
                </span>
              </div>
            {:else}
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
            {/if}
          </Panel>
        </div>
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

        <!-- =============================================================== -->
        <!-- TW-11: PANEL DEL MIEMBRO PARA SOLICITAR REASIGNACIÓN (20% DÍAS) -->
        <!-- =============================================================== -->
        {#if esResponsableActual && !reasignadaDelUsuario && (data.tarea.estado === 'ASIGNADA' || data.tarea.estado === 'EN_PROCESO')}
          <Panel
            titulo="Solicitar Reasignacion"
            descripcion="Puedes solicitar al encargado pasar esta tarea a otro integrante por un corto periodo de tiempo."
          >
            {#if data.rechazoReasignacionReciente}
              <div class="mb-3 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-200">
                <p class="font-bold text-red-300">No se pudo cambiar tu asignación:</p>
                <p class="mt-1 whitespace-pre-line">{data.rechazoReasignacionReciente.motivoRechazo}</p>
              </div>
            {/if}

            {#if data.solicitudPendiente}
              <div class="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs text-amber-200">
                <div class="flex items-center gap-2 font-bold text-amber-300">
                  <span class="material-symbols-outlined text-base">hourglass_top</span>
                  <span>Solicitud enviada al encargado</span>
                </div>
                <p class="mt-1.5 text-amber-100/80">
                  Motivo enviado: "{data.solicitudPendiente.motivo}"
                </p>
              </div>
            {:else if data.plazoReasignacion?.dentroDePlazo}
              <div class="space-y-3 text-xs">
                <div class="rounded-xl border border-tezcat-border bg-tezcat-bg p-3">
                  <p class="font-mono text-[10px] text-tezcat-cyan uppercase">
                    Plazo disponible
                  </p>
                  <p class="mt-1 text-tezcat-textSecondary">
                    Tienes hasta el <strong>{fecha(data.plazoReasignacion.fechaLimiteSolicitud)}</strong> para solicitar reasignación.
                  </p>
                </div>

                {#if !mostrarFormularioSolicitud}
                  <button
                    type="button"
                    onclick={() => (mostrarFormularioSolicitud = true)}
                    class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                  >
                    <span class="material-symbols-outlined text-base">swap_horiz</span>
                    Solicitar cambio de asignación
                  </button>
                {:else}
                  <form
                    method="POST"
                    action="?/solicitarReasignacion"
                    class="space-y-2.5"
                    use:enhance={() => {
                      enviandoSolicitud = true;
                      return async ({ update }) => {
                        enviandoSolicitud = false;
                        mostrarFormularioSolicitud = false;
                        motivoSolicitud = '';
                        await update();
                      };
                    }}
                  >
                    <label for="motivoSolicitud" class={etiqueta}>
                      ¿Por qué solicitas el cambio de esta actividad? *
                    </label>
                    <textarea
                      id="motivoSolicitud"
                      name="motivo"
                      rows="3"
                      required
                      maxlength="1000"
                      bind:value={motivoSolicitud}
                      placeholder="Explica al encargado por qué necesitas que esta tarea se asigne a otra persona…"
                      class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg px-3 py-2 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
                    ></textarea>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        onclick={() => (mostrarFormularioSolicitud = false)}
                        class="flex-1 rounded-xl border border-tezcat-border py-2 text-xs font-semibold text-tezcat-textSecondary hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={enviandoSolicitud || !motivoSolicitud.trim()}
                        class="flex-1 rounded-xl bg-amber-400 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-45"
                      >
                        Enviar solicitud
                      </button>
                    </div>
                  </form>
                {/if}
              </div>
            {:else}
              <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/60 p-3 text-xs text-tezcat-textMuted">
                El plazo del 20% ({data.plazoReasignacion?.diasPermitidos ?? 1} día{(data.plazoReasignacion?.diasPermitidos ?? 1) === 1 ? '' : 's'}) para solicitar cambio de asignación en esta tarea ha finalizado.
              </div>
            {/if}
          </Panel>
        {/if}

        <!-- TW-08: Archivos y Evidencias -->
        <Panel
          titulo="Archivos De La Tarea"
          descripcion="Adjunta los archivos para esta actividad."
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
                    {#if reasignadaDelUsuario}
                      <div class="flex min-w-0 items-start gap-2 opacity-60">
                        <span class="material-symbols-outlined mt-0.5 text-base text-tezcat-textMuted">
                          {a.mimeType === 'text/uri-list' ? 'link' : 'description'}
                        </span>
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-tezcat-textSecondary">{a.nombre}</p>
                          <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                            {formatearBytes(a.tamanoBytes)} · {a.subidoPorNombre ?? 'Usuario'}
                          </p>
                        </div>
                      </div>
                    {:else}
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
                    {/if}

                    {#if !reasignadaDelUsuario && (data.user.rol === 'ENCARGADO' || data.user.id === a.subidoPorId || data.user.rol === 'ADMIN')}
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

          {#if data.tarea.estado !== 'TERMINADA' && !reasignadaDelUsuario}
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
