<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Auditoría | Tezcat Workflow</title></svelte:head>
<main class="mx-auto max-w-5xl p-8">
  <h1 class="mb-6 text-2xl font-bold">Auditoría administrativa</h1>
  <div class="overflow-x-auto rounded border bg-white">
    <table class="w-full text-left text-sm">
      <thead class="bg-slate-100"><tr><th class="p-3">Fecha</th><th class="p-3">Acción</th><th class="p-3">Actor</th><th class="p-3">Objetivo</th><th class="p-3">Detalle</th></tr></thead>
      <tbody>
        {#each data.eventos as evento}
          <tr class="border-t">
            <td class="p-3">{new Date(evento.creadaEn).toLocaleString('es-MX')}</td>
            <td class="p-3">{evento.accion}</td>
            <td class="p-3">{evento.actorId ?? '—'}</td>
            <td class="p-3">{evento.usuarioObjetivoId ?? '—'}</td>
            <td class="p-3"><code>{JSON.stringify(evento.detalle)}</code></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</main>
