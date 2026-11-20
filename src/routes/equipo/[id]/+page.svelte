<script lang="ts">
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const roles: Record<string, string> = { ADMIN: 'Administrador', ENCARGADO: 'Encargado', MIEMBRO: 'Miembro' };
</script>

<svelte:head><title>{data.integrante.nombre} | Mi equipo | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary">
  <EncabezadoApp user={data.user} />
  <main class="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <a href="/equipo" class="inline-flex items-center gap-2 rounded text-sm font-semibold text-tezcat-cyan hover:underline focus-visible:outline-2 focus-visible:outline-tezcat-cyan">
      <span aria-hidden="true" class="material-symbols-outlined text-base">arrow_back</span>
      Volver a Equipo
    </a>
    <section aria-labelledby="nombre-integrante" class="rounded-xl border border-tezcat-border bg-tezcat-card p-6 sm:p-8">
      <div class="flex items-center gap-5">
        {#if data.integrante.tieneFoto}
          <img src={`/equipo/${data.integrante.id}/foto`} alt="" width="80" height="80" class="size-20 shrink-0 rounded-xl object-cover" />
        {:else}
          <span aria-hidden="true" class="grid size-20 shrink-0 place-items-center rounded-xl border border-tezcat-border bg-tezcat-surfaceAlt text-3xl font-bold text-tezcat-cyan">
            {data.integrante.nombre.trim().slice(0, 1).toLocaleUpperCase()}
          </span>
        {/if}
        <div class="min-w-0">
          <h1 id="nombre-integrante" class="break-words text-2xl font-bold sm:text-3xl">{data.integrante.nombre}</h1>
          <p class="mt-1 break-words text-sm text-tezcat-textSecondary">
            {roles[data.integrante.rol]} · {data.integrante.departamento}
          </p>
        </div>
      </div>
      <dl class="mt-6 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-tezcat-border bg-tezcat-bg p-4">
          <dt class="text-sm text-tezcat-textSecondary">Nivel</dt>
          <dd class="mt-1 text-xl font-semibold text-tezcat-cyan">{data.integrante.nivel}</dd>
        </div>
        <div class="rounded-lg border border-tezcat-border bg-tezcat-bg p-4">
          <dt class="text-sm text-tezcat-textSecondary">Contribuciones opcionales aprobadas</dt>
          <dd class="mt-1 text-xl font-semibold text-tezcat-cyan">{data.integrante.contribuciones}</dd>
        </div>
      </dl>
    </section>
  </main>
</div>
