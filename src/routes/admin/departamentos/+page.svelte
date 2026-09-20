<script lang="ts">
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Departamentos | Tezcat Workflow</title></svelte:head>
<main class="mx-auto max-w-4xl p-8">
  <h1 class="mb-6 text-2xl font-bold">Departamentos</h1>
  {#if form?.error}<p role="alert" class="mb-4 text-red-700">{form.error}</p>{/if}
  {#if form?.ok}<p role="status" class="mb-4 text-green-700">{form.ok}</p>{/if}
  <form method="POST" action="?/crear" class="mb-8 flex gap-3 rounded border bg-white p-4">
    <input class="min-w-0 flex-1 rounded border p-2" name="nombre" maxlength="120" placeholder="Nombre del departamento" required />
    <button class="rounded bg-slate-900 px-4 text-white" type="submit">Crear</button>
  </form>
  <div class="grid gap-3">
    {#each data.departamentos as dep}
      <form method="POST" action="?/actualizar" class="flex flex-wrap items-center gap-3 rounded border bg-white p-4">
        <input type="hidden" name="id" value={dep.id} />
        <label class="flex-1">Nombre <input class="w-full rounded border p-2" name="nombre" value={dep.nombre} required /></label>
        <label>Estado <select class="rounded border p-2" name="activo" value={String(dep.activo)}>
          <option value="true">Activo</option><option value="false">Inactivo</option>
        </select></label>
        <button class="rounded border p-2" type="submit">Guardar</button>
      </form>
    {/each}
  </div>
</main>
