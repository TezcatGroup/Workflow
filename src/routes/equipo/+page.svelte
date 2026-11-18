<script lang="ts">
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let busqueda = $state(''), rol = $state('');
  const lista = $derived(data.miembros.filter(m => m.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()) && (!rol || m.rol === rol)));
  const campo = 'w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm text-tezcat-textPrimary placeholder-tezcat-textSecondary focus:outline-none focus:ring-2 focus:ring-tezcat-cyan/60 [&>option]:bg-tezcat-card';
  const roles: Record<string,string> = { ADMIN:'Administrador', ENCARGADO:'Encargado', MIEMBRO:'Miembro' };
</script>
<svelte:head><title>Mi equipo | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary">
  <EncabezadoApp user={data.user} />
  <main class="mx-auto max-w-7xl space-y-6 px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Mi equipo</h1><p class="mt-2 text-sm text-tezcat-textSecondary">{data.departamento ?? 'Sin departamento asignado'} · Personas con una cuenta activa en tu departamento.</p></div><a href="/tareas/nueva" class="rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-4 py-2.5 text-sm font-semibold text-tezcat-cyan hover:bg-tezcat-cyan/20 focus-visible:outline-2 focus-visible:outline-tezcat-cyan">Crear tarea</a></div>
    <section aria-labelledby="personas" class="rounded-xl border border-tezcat-border bg-tezcat-card">
      <div class="space-y-4 border-b border-tezcat-border p-5"><div class="flex items-center justify-between gap-3"><h2 id="personas" class="text-lg font-semibold">Integrantes del equipo</h2><span aria-live="polite" class="font-mono text-sm text-tezcat-cyan">{lista.length} / {data.miembros.length}</span></div><div class="grid gap-3 sm:grid-cols-[1fr_220px]"><div><label for="buscar-miembro" class="mb-2 block text-sm">Buscar persona</label><input id="buscar-miembro" type="search" class={campo} placeholder="Buscar por nombre…" bind:value={busqueda} /></div><div><label for="rol" class="mb-2 block text-sm">Rol</label><select id="rol" class={campo} bind:value={rol}><option value="">Todos los roles</option>{#each Object.entries(roles) as [valor, nombre]}<option value={valor}>{nombre}</option>{/each}</select></div></div></div>
      <ul class="divide-y divide-tezcat-border">
        {#each lista as miembro (miembro.id)}
          <li class="flex flex-wrap items-center gap-4 px-5 py-4">{#if miembro.fotoPerfil}<img src={`/equipo/${miembro.id}/foto`} alt={`Foto de ${miembro.nombre}`} width="40" height="40" class="size-10 shrink-0 rounded-lg object-cover" />{:else}<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-tezcat-border bg-tezcat-bg font-semibold text-tezcat-cyan">{miembro.nombre.trim().slice(0,1).toLocaleUpperCase()}</span>{/if}<div class="min-w-0 flex-1"><p class="break-words font-medium">{miembro.nombre} {#if miembro.id === data.user.id}<span class="ml-1 text-xs text-tezcat-textSecondary">(Tú)</span>{/if}</p><p class="mt-1 text-xs text-tezcat-textSecondary">{data.departamento}</p></div><span class="rounded border border-tezcat-border px-2 py-1 text-xs {miembro.rol === 'ENCARGADO' ? 'text-tezcat-cyan' : 'text-tezcat-textSecondary'}">{roles[miembro.rol]}</span></li>
        {:else}
          <li class="p-10 text-center"><span aria-hidden="true" class="material-symbols-outlined text-3xl text-tezcat-textSecondary">group</span><h3 class="mt-3 font-semibold">{data.miembros.length ? 'No hay personas con esos filtros' : 'No hay integrantes para mostrar'}</h3><p class="mt-2 text-sm text-tezcat-textSecondary">{data.miembros.length ? 'Prueba otro nombre o cambia el rol.' : 'Un administrador puede asignar las cuentas a tu departamento.'}</p>{#if data.miembros.length}<button type="button" onclick={() => { busqueda=''; rol=''; }} class="mt-4 text-sm text-tezcat-cyan underline underline-offset-4">Restablecer filtros</button>{/if}</li>
        {/each}
      </ul>
    </section>
  </main>
</div>
