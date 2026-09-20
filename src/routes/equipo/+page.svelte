<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Mi equipo | Tezcat Workflow</title></svelte:head>
<main class="mx-auto max-w-3xl p-8">
  <a href="/dashboard" class="underline">Volver al dashboard</a>
  <h1 class="my-6 text-2xl font-bold">Mi equipo</h1>
  <ul class="grid gap-3">
    {#each data.miembros as miembro}
      <li class="rounded border bg-white p-4">{miembro.nombre} · {miembro.rol}</li>
    {/each}
  </ul>
</main>
