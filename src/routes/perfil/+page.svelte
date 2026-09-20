<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Mi perfil | Tezcat Workflow</title></svelte:head>
<main class="mx-auto max-w-3xl p-8">
  <a href="/dashboard" class="underline">Volver al dashboard</a>
  <h1 class="my-6 text-2xl font-bold">Mi perfil</h1>
  <dl class="grid gap-3 rounded border bg-white p-5">
    <div><dt class="font-semibold">Nombre</dt><dd>{data.user.nombre}</dd></div>
    <div><dt class="font-semibold">Rol</dt><dd>{data.user.rol}</dd></div>
    <div><dt class="font-semibold">Departamento</dt><dd>{data.user.departamentoId ?? 'Sin asignar'}</dd></div>
  </dl>
</main>
