<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // VISTA PROVISIONAL (backend): funcional pero sin diseño final. El frontend puede reemplazarla
  // completa; el contrato de datos está en +page.server.ts.
  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', TERMINADA: 'Terminada'
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

  const etiqueta = 'font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';
</script>

<svelte:head><title>{data.tarea.titulo} | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-4xl space-y-6 px-4 py-6">
    <div>
      <a href="/tareas" class="text-sm text-tezcat-cyan">← Volver a tareas</a>
      <p class="mt-3 font-mono text-[10px] tracking-wider text-tezcat-cyan uppercase">
        CORE-{data.tarea.numero ?? '?'} · {data.tarea.tipo}
      </p>
      <h1 class="mt-1 text-3xl font-bold tracking-tight">{data.tarea.titulo}</h1>
      <p class="mt-2">
        <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-xs text-tezcat-gold">
          {textoEstado[data.tarea.estado] ?? data.tarea.estado}
        </span>
      </p>
    </div>

    {#if form?.error}
      <p role="alert" class="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{form.error}</p>
    {:else if form?.ok}
      <p role="status" class="rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-3 py-2 text-sm text-tezcat-cyan">{form.ok}</p>
    {/if}

    {#if data.transicionesPermitidas.length > 0}
      <div class="flex flex-wrap gap-3">
        {#each data.transicionesPermitidas as destino (destino)}
          <form method="POST" action="?/cambiarEstado" use:enhance>
            <input type="hidden" name="estado" value={destino} />
            <button class="rounded-lg border border-tezcat-borderHighlight bg-tezcat-surfaceAlt px-4 py-2 text-sm font-semibold">
              {textoBoton(destino)}
            </button>
          </form>
        {/each}
      </div>
    {/if}

    <Panel titulo="Información">
      <dl class="grid gap-4 sm:grid-cols-2">
        <div><dt class={etiqueta}>Responsable</dt><dd>{data.responsable?.nombre ?? 'Sin asignar'}</dd></div>
        <div><dt class={etiqueta}>Revisor</dt><dd>{data.revisor?.nombre ?? 'Sin revisor'}</dd></div>
        <div><dt class={etiqueta}>Creada por</dt><dd>{data.creador?.nombre ?? '—'}</dd></div>
        <div><dt class={etiqueta}>Proyecto</dt><dd>{data.proyecto?.nombre ?? 'Sin proyecto'}</dd></div>
        <div><dt class={etiqueta}>Fecha límite</dt><dd>{fecha(data.tarea.fechaLimite)}</dd></div>
        <div><dt class={etiqueta}>Prioridad / Dificultad</dt><dd>{data.tarea.prioridad ?? '—'} / {data.tarea.dificultad ?? '—'}</dd></div>
        <div><dt class={etiqueta}>Creada</dt><dd>{fecha(data.tarea.creadoEn)}</dd></div>
        <div><dt class={etiqueta}>Última actualización</dt><dd>{fecha(data.tarea.actualizadoEn)}</dd></div>
      </dl>
      {#if data.tarea.descripcion}
        <p class="mt-4 text-sm whitespace-pre-line text-tezcat-textSecondary">{data.tarea.descripcion}</p>
      {/if}
    </Panel>

    <Panel titulo="Criterios de aceptación">
      {#if data.criterios.length === 0}
        <p class="text-sm text-tezcat-textSecondary">Esta tarea no tiene criterios.</p>
      {:else}
        <ul class="space-y-2 text-sm">
          {#each data.criterios as c (c.id)}
            <li class="flex items-center gap-2">
              <input type="checkbox" checked={c.completado} disabled aria-label={c.descripcion} />
              <span>{c.descripcion}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel titulo="Archivos">
      {#if data.archivos.length === 0}
        <p class="text-sm text-tezcat-textSecondary">Sin archivos adjuntos.</p>
      {:else}
        <ul class="space-y-1 text-sm">
          {#each data.archivos as a (a.id)}<li>{a.nombre}</li>{/each}
        </ul>
      {/if}
    </Panel>

    <Panel titulo="Historial">
      <ul class="space-y-2 text-sm">
        {#each data.eventos as e (e.id)}
          <li>
            <span class="font-mono text-xs text-tezcat-textSecondary">{fecha(e.creadoEn)}</span>
            · {textoEvento(e)}{e.actorNombre ? ` · ${e.actorNombre}` : ''}
          </li>
        {/each}
      </ul>
    </Panel>
  </main>
</div>
