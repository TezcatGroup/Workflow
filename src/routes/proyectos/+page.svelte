<script lang="ts">
  import { enhance } from '$app/forms';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let buscar = $state(''), estado = $state('');
  const lista = $derived(data.proyectos.filter(p => p.nombre.toLocaleLowerCase().includes(buscar.toLocaleLowerCase()) && (!estado || String(p.activo) === estado)));
  const campo = 'mt-1 w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tezcat-cyan';
  const estadoTarea = {
    ASIGNADA: 'Asignada', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', TERMINADA: 'Terminada'
  };
  const boton = 'rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-4 py-2.5 text-sm font-semibold text-tezcat-cyan hover:bg-tezcat-cyan/20';
</script>
<svelte:head><title>Proyectos | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg text-tezcat-textPrimary">
  <EncabezadoApp user={data.user} />
  <main class="mx-auto max-w-7xl space-y-6 px-4 py-8">
    <div><h1 class="text-3xl font-bold">Proyectos</h1><p class="mt-2 text-sm text-tezcat-textSecondary">Organiza las tareas de cada departamento. Archivar un proyecto conserva sus tareas e historial.</p></div>
    {#if form?.error}<p role="alert" class="rounded-lg bg-red-400/10 p-4 text-red-300">{form.error}</p>{/if}
    {#if form?.ok}<p role="status" class="rounded-lg bg-tezcat-cyan/10 p-4 text-tezcat-cyan">{form.ok}</p>{/if}
    <section class="rounded-xl border border-tezcat-border bg-tezcat-card p-5">
      <h2 class="mb-4 text-lg font-semibold">Crear proyecto</h2>
      <form method="POST" action="?/crear" use:enhance class="grid gap-4 sm:grid-cols-2">
        <label>Nombre<input class={campo} name="nombre" required maxlength="160" /></label>
        <label>Departamento<select class={campo} name="departamentoId" required><option value="">Selecciona un departamento</option>{#each data.departamentos.filter(d => d.activo) as d}<option value={d.id}>{d.nombre}</option>{/each}</select></label>
        <label class="sm:col-span-2">Descripción<textarea class={campo} name="descripcion" maxlength="5000" rows="2"></textarea></label>
        <button class="{boton} justify-self-start" type="submit">Crear proyecto</button>
      </form>
    </section>
    <div class="grid gap-4 sm:grid-cols-2"><label>Buscar proyecto<input class={campo} type="search" bind:value={buscar} /></label><label>Estado<select class={campo} bind:value={estado}><option value="">Todos</option><option value="true">Activos</option><option value="false">Archivados</option></select></label></div>
    <section aria-label="Lista de proyectos" class="space-y-3">
      {#each lista as p (p.id)}
        <details class="rounded-xl border border-tezcat-border bg-tezcat-card p-5">
          <summary class="cursor-pointer break-words font-semibold">{p.nombre} <span class="ml-2 text-xs text-tezcat-textSecondary">{data.departamentos.find(d => d.id === p.departamentoId)?.nombre ?? 'Sin departamento'} · {p.activo ? 'Activo' : 'Archivado'}</span></summary>
          <form method="POST" action="?/actualizar" use:enhance class="mt-5 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="departamentoId" value={p.departamentoId ?? ''} />
            <label>Nombre<input class={campo} name="nombre" value={p.nombre} required maxlength="160" /></label>
            <label>Estado<select class={campo} name="activo" value={String(p.activo)}><option value="true">Activo</option><option value="false">Archivado</option></select></label>
            <label class="sm:col-span-2">Descripción<textarea class={campo} name="descripcion" maxlength="5000" rows="3">{p.descripcion ?? ''}</textarea></label>
            <button class="{boton} justify-self-start" type="submit">Guardar cambios</button>
          </form>
          <section aria-label={`Tareas de ${p.nombre}`} class="mt-5 border-t border-tezcat-border pt-4">
            <h3 class="font-semibold">Tareas relacionadas ({p.tareas.length})</h3>
            {#if p.tareas.length}
              <ul class="mt-2 divide-y divide-tezcat-border">
                {#each p.tareas as tarea (tarea.id)}
                  <li class="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <a href={`/tareas/${tarea.id}`} class="min-w-0 break-words text-sm font-semibold text-tezcat-cyan hover:underline focus-visible:outline-2 focus-visible:outline-tezcat-cyan">
                      {tarea.titulo}
                    </a>
                    <span class="rounded border border-tezcat-border px-2 py-1 text-xs text-tezcat-textSecondary">
                      {estadoTarea[tarea.estado]}
                    </span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-2 text-sm text-tezcat-textSecondary">No hay tareas vinculadas a este proyecto.</p>
            {/if}
          </section>
        </details>
      {:else}<p class="rounded-xl border border-tezcat-border p-8 text-center text-tezcat-textSecondary">No hay proyectos con esos filtros. Crea uno para organizar las tareas.</p>{/each}
    </section>
  </main>
</div>
