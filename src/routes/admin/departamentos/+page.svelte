<script lang="ts">
  import { enhance } from '$app/forms';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let busqueda = $state(''), estado = $state(''), creando = $state(false);
  let guardando = $state<string[]>([]);
  const campo = 'w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm text-tezcat-textPrimary placeholder-tezcat-textSecondary focus:outline-none focus:ring-2 focus:ring-tezcat-cyan/60 [&>option]:bg-tezcat-card';
  const lista = $derived(data.departamentos.filter(d => d.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()) && (!estado || String(d.activo) === estado)));
  const activos = $derived(data.departamentos.filter(d => d.activo).length);
</script>

<svelte:head><title>Departamentos | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary">
  <EncabezadoApp user={data.admin} />
  <main class="mx-auto max-w-7xl space-y-6 px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="text-3xl font-bold tracking-tight">Departamentos</h1><p class="mt-2 max-w-2xl text-sm text-tezcat-textSecondary">Organiza los equipos de trabajo y administra las áreas disponibles para asignar usuarios.</p></div>
      <p class="rounded-lg border border-tezcat-border bg-tezcat-card px-4 py-3 text-sm"><strong class="font-mono text-tezcat-cyan">{activos}</strong> activos <span class="mx-2 text-tezcat-textSecondary">/</span> {data.departamentos.length} en total</p>
    </div>
    {#if form?.error}<p role="alert" class="rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-4 text-sm text-red-300">{form.error}</p>{/if}
    {#if form?.ok}<p role="status" class="rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 p-4 text-sm text-tezcat-cyan">{form.ok}</p>{/if}
    <section aria-labelledby="nuevo-departamento" class="rounded-xl border border-tezcat-border bg-tezcat-card p-5 sm:p-6">
      <h2 id="nuevo-departamento" class="text-lg font-semibold">Crear departamento</h2><p class="mt-1 text-sm text-tezcat-textSecondary">El nuevo departamento estará activo y disponible para asignar cuentas.</p>
      <form method="POST" action="?/crear" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" use:enhance={() => {
        creando = true; return async ({ update }) => { try { await update(); } finally { creando = false; } };
      }}>
        <div class="flex-1"><label for="nuevo-nombre" class="mb-2 block text-sm font-medium">Nombre del departamento</label><input id="nuevo-nombre" class={campo} name="nombre" maxlength="120" placeholder="Ej. Desarrollo de software" required /></div>
        <button disabled={creando} class="rounded-lg bg-linear-to-r from-tezcat-cyan to-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:from-tezcat-cyanHover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tezcat-cyan disabled:opacity-60" type="submit">{creando ? 'Creando…' : 'Crear departamento'}</button>
      </form>
    </section>
    <section aria-labelledby="directorio">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="directorio" class="text-xl font-semibold">Directorio de departamentos</h2><span aria-live="polite" class="text-sm text-tezcat-textSecondary">{lista.length} de {data.departamentos.length}</span></div>
      <div class="mb-4 grid gap-3 rounded-xl border border-tezcat-border bg-tezcat-card p-4 sm:grid-cols-[1fr_220px]">
        <div><label for="buscar" class="mb-2 block text-sm">Buscar departamento</label><input id="buscar" type="search" class={campo} bind:value={busqueda} placeholder="Buscar por nombre…" /></div>
        <div><label for="estado" class="mb-2 block text-sm">Estado</label><select id="estado" class={campo} bind:value={estado}><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select></div>
      </div>
      <div class="space-y-3">
        {#each lista as dep (dep.id)}
          <form method="POST" action="?/actualizar" aria-label={`Editar ${dep.nombre}`} class="rounded-xl border border-tezcat-border bg-tezcat-card p-5" use:enhance={() => {
            guardando = [...guardando, dep.id]; return async ({ update }) => { try { await update({ reset: false }); } finally { guardando = guardando.filter(id => id !== dep.id); } };
          }}>
            <input type="hidden" name="id" value={dep.id} />
            <div class="mb-4 flex items-center gap-2"><span aria-hidden="true" class="material-symbols-outlined text-tezcat-cyan">corporate_fare</span><h3 class="min-w-0 flex-1 break-words font-semibold">{dep.nombre}</h3><span class="rounded border px-2 py-1 text-xs {dep.activo ? 'border-tezcat-cyan/30 bg-tezcat-cyan/10 text-tezcat-cyan' : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary'}">{dep.activo ? 'Activo' : 'Inactivo'}</span></div>
            <div class="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <div><label for={`nombre-${dep.id}`} class="mb-2 block text-sm text-tezcat-textSecondary">Nombre</label><input id={`nombre-${dep.id}`} class={campo} name="nombre" value={dep.nombre} maxlength="120" required /></div>
              <div><label for={`activo-${dep.id}`} class="mb-2 block text-sm text-tezcat-textSecondary">Estado</label><select id={`activo-${dep.id}`} class={campo} name="activo" value={String(dep.activo)}><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
              <button disabled={guardando.includes(dep.id)} class="rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-4 py-2.5 text-sm font-semibold hover:border-tezcat-cyan focus-visible:outline-2 focus-visible:outline-tezcat-cyan disabled:opacity-60" type="submit">{guardando.includes(dep.id) ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </form>
        {:else}
          <div class="rounded-xl border border-dashed border-tezcat-border p-10 text-center"><span aria-hidden="true" class="material-symbols-outlined text-3xl text-tezcat-textSecondary">corporate_fare</span><h3 class="mt-3 font-semibold">{data.departamentos.length ? 'No hay coincidencias' : 'Aún no hay departamentos'}</h3><p class="mt-2 text-sm text-tezcat-textSecondary">{data.departamentos.length ? 'Prueba otro nombre o cambia el estado seleccionado.' : 'Crea el primero para comenzar a organizar tus equipos.'}</p>{#if data.departamentos.length}<button type="button" onclick={() => { busqueda = ''; estado = ''; }} class="mt-4 text-sm font-semibold text-tezcat-cyan underline underline-offset-4">Restablecer filtros</button>{/if}</div>
        {/each}
      </div>
      <p class="mt-4 text-sm text-tezcat-textSecondary">Desactivar un departamento conserva su información; deja de estar disponible para nuevas asignaciones de usuarios.</p>
    </section>
  </main>
</div>
