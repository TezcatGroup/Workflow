<script lang="ts">
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import GraficaRadarRamas from '$lib/components/GraficaRadarRamas.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const roles: Record<string, string> = { ADMIN: 'Administrador', ENCARGADO: 'Encargado', MIEMBRO: 'Miembro' };
  const numeros = new Intl.NumberFormat('es-MX');
  const fechas = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' });
</script>

<svelte:head><title>{data.integrante.nombre} | Mi equipo | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary">
  <EncabezadoApp user={data.user} />
  <main class="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <a href="/equipo" class="inline-flex items-center gap-2 rounded text-sm font-semibold text-tezcat-cyan hover:underline focus-visible:outline-2 focus-visible:outline-tezcat-cyan">
      <span aria-hidden="true" class="material-symbols-outlined text-base">arrow_back</span>
      Volver a Equipo
    </a>
    <section aria-labelledby="nombre-integrante" class="grid gap-6 rounded-2xl border border-tezcat-border bg-linear-to-br from-tezcat-card to-tezcat-surfaceAlt p-6 sm:p-8 lg:grid-cols-[1fr_20rem] lg:items-center">
      <div class="flex items-start gap-4 sm:gap-6">
        {#if data.integrante.tieneFoto}
          <img src={`/equipo/${data.integrante.id}/foto`} alt="" width="112" height="112" class="size-20 shrink-0 rounded-xl object-cover ring-2 ring-tezcat-cyan/30 sm:size-28" />
        {:else}
          <span aria-hidden="true" class="grid size-20 shrink-0 place-items-center rounded-xl border border-tezcat-border bg-tezcat-bg text-3xl font-bold text-tezcat-cyan sm:size-28">
            {data.integrante.nombre.trim().slice(0, 1).toLocaleUpperCase()}
          </span>
        {/if}
        <div class="min-w-0">
          <p class="text-sm font-medium text-tezcat-cyan">{roles[data.integrante.rol]} · {data.integrante.departamento}</p>
          <h1 id="nombre-integrante" class="mt-1 break-words text-2xl font-bold sm:text-4xl">{data.integrante.nombre}</h1>
          <a href={`mailto:${data.integrante.email}`} class="mt-2 inline-block break-all text-sm text-tezcat-textSecondary hover:text-tezcat-cyan hover:underline">
            {data.integrante.email}
          </a>
        </div>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-bg p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span class="text-lg font-bold">Nivel {data.progreso.nivel}</span>
          <span class="font-mono text-sm font-semibold text-tezcat-cyan">{numeros.format(data.progreso.expTotal)} EXP</span>
        </div>
        <div role="progressbar" aria-label="Progreso al siguiente nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow={data.progreso.porcentajeNivel}
          class="mt-3 h-2 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
          <div class="h-full rounded-full bg-tezcat-cyan" style:width={`${data.progreso.porcentajeNivel}%`}></div>
        </div>
        <p class="mt-2 text-xs text-tezcat-textSecondary">{numeros.format(data.progreso.expRestanteParaSubir)} EXP para el siguiente nivel</p>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Panel titulo="Habilidades técnicas">
        {#if data.especialidades.length}
          <ul class="mb-4 flex flex-wrap gap-2">
            {#each data.especialidades as habilidad (habilidad.nombre)}
              <li class="rounded-lg border border-tezcat-cyan/30 bg-tezcat-cyan/10 px-3 py-1.5 text-sm text-tezcat-cyan">
                <strong>{habilidad.nombre}</strong> · {habilidad.rango}
              </li>
            {/each}
          </ul>
        {/if}
        <GraficaRadarRamas habilidades={data.habilidades} />
      </Panel>
      <Panel titulo={`Insignias desbloqueadas (${data.insignias.length})`} acento="gold">
        <ul class="space-y-3">
          {#each data.insignias as insignia (insignia.id)}
            <li class="flex items-center gap-3 rounded-lg border border-tezcat-border bg-tezcat-bg p-3">
              <span aria-hidden="true" class="material-symbols-outlined text-2xl text-tezcat-gold">{insignia.icono}</span>
              <div>
                <h3 class="text-sm font-semibold">{insignia.titulo}</h3>
                <p class="mt-1 text-xs text-tezcat-textSecondary">{insignia.descripcion}</p>
              </div>
            </li>
          {:else}
            <li class="text-sm text-tezcat-textSecondary">Todavía no tiene insignias desbloqueadas.</li>
          {/each}
        </ul>
      </Panel>
    </div>

    <Panel titulo={`Contribuciones opcionales aprobadas (${data.totalContribuciones})`}>
      <ul class="divide-y divide-tezcat-border">
        {#each data.contribuciones as contribucion (contribucion.id)}
          <li class="py-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              {#if data.user.rol === 'ENCARGADO' || data.user.id === data.integrante.id}
                <a href={`/tareas/${contribucion.id}`} class="break-words font-semibold text-tezcat-cyan hover:underline">{contribucion.titulo}</a>
              {:else}
                <span class="break-words font-semibold">{contribucion.titulo}</span>
              {/if}
              <time datetime={new Date(contribucion.fechaAprobacion).toISOString()} class="text-sm text-tezcat-textSecondary">
                {fechas.format(new Date(contribucion.fechaAprobacion))}
              </time>
            </div>
            <p class="mt-1 text-sm text-tezcat-textSecondary">
              {[contribucion.proyectoNombre, ...contribucion.etiquetas.map((etiqueta) => etiqueta.nombre)].filter(Boolean).join(' · ')}
            </p>
          </li>
        {:else}
          <li class="text-sm text-tezcat-textSecondary">No hay contribuciones disponibles para consultar en este equipo.</li>
        {/each}
      </ul>
    </Panel>
  </main>
</div>
