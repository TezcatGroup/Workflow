<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data }: { data: PageData } = $props();

  // VISTA PROVISIONAL (backend): funcional pero sin diseño final. El frontend puede reemplazarla
  // completa; el contrato de datos está en +page.server.ts.
  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', TERMINADA: 'Terminada'
  };
  const fecha = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : 'Sin fecha';
</script>

<svelte:head><title>Tareas | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
    <Panel titulo="Tareas" descripcion="Tareas obligatorias asignadas y su estado.">
      {#snippet acciones()}
        {#if data.puedeCrear}
          <a href="/tareas/nueva" class="rounded-lg border border-tezcat-borderHighlight bg-tezcat-surfaceAlt px-3 py-2 text-sm font-semibold">
            + Nueva tarea
          </a>
        {/if}
      {/snippet}

      {#if data.tareas.length === 0}
        <p class="text-sm text-tezcat-textSecondary">No hay tareas para mostrar.</p>
      {:else}
        <ul class="space-y-2">
          {#each data.tareas as t (t.id)}
            <li>
              <a href="/tareas/{t.id}" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-tezcat-border bg-tezcat-bg p-4 transition-colors hover:border-tezcat-borderHighlight">
                <div class="min-w-0">
                  <p class="font-mono text-[10px] tracking-wider text-tezcat-cyan uppercase">CORE-{t.numero ?? '?'} · {t.prioridad ?? '—'}</p>
                  <p class="truncate font-semibold">{t.titulo}</p>
                  <p class="text-xs text-tezcat-textSecondary">Responsable: {t.responsableNombre ?? 'Sin asignar'} · Vence: {fecha(t.fechaLimite)}</p>
                </div>
                <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-xs text-tezcat-gold">
                  {textoEstado[t.estado] ?? t.estado}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </main>
</div>
