<script lang="ts">
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let busqueda = $state(''), accion = $state('');
  const campo = 'w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm text-tezcat-textPrimary placeholder-tezcat-textSecondary focus:outline-none focus:ring-2 focus:ring-tezcat-cyan/60 [&>option]:bg-tezcat-card';
  const nombres: Record<string,string> = { USUARIO_CREADO:'Usuario creado', USUARIO_ACTUALIZADO:'Usuario actualizado', USUARIO_ACTIVADO:'Usuario activado', USUARIO_DESACTIVADO:'Usuario desactivado', USUARIO_ELIMINADO:'Usuario eliminado', DEPARTAMENTO_CREADO:'Departamento creado', DEPARTAMENTO_ACTUALIZADO:'Departamento actualizado', RECOMPENSA_CREADA:'Recompensa creada', RECOMPENSA_ACTUALIZADA:'Recompensa actualizada', RECOMPENSA_ACTIVADA:'Recompensa activada', RECOMPENSA_DESACTIVADA:'Recompensa desactivada', CANJE_ENTREGADO:'Canje entregado', CANJE_CANCELADO:'Canje cancelado' };
  const titulo = (key: string) => nombres[key] ?? key.replaceAll('_', ' ');
  const acciones = $derived([...new Set(data.eventos.map(e => e.accion))].sort());
  const lista = $derived(data.eventos.filter(e => (!accion || e.accion === accion) && `${titulo(e.accion)} ${e.actorNombre} ${e.objetivoNombre ?? ''} ${e.actorId ?? ''} ${e.usuarioObjetivoId ?? ''} ${JSON.stringify(e.detalle)}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())));
</script>

<svelte:head><title>Auditoría | Tezcat Workflow</title></svelte:head>
<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary">
  <EncabezadoApp user={data.admin} />
  <main class="mx-auto max-w-7xl space-y-6 px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Auditoría administrativa</h1><p class="mt-2 max-w-2xl text-sm text-tezcat-textSecondary">Consulta quién hizo cada cambio y revisa los datos registrados en la operación.</p></div><span class="rounded-lg border border-tezcat-border bg-tezcat-card px-4 py-3 text-sm"><strong class="font-mono text-tezcat-cyan">{data.eventos.length}</strong> eventos recientes</span></div>
    <div class="grid gap-4 rounded-xl border border-tezcat-border bg-tezcat-card p-5 sm:grid-cols-[1fr_260px]">
      <div><label for="buscar-eventos" class="mb-2 block text-sm font-medium">Buscar en el registro</label><input id="buscar-eventos" type="search" class={campo} placeholder="Persona, acción o contenido del detalle…" bind:value={busqueda} /></div>
      <div><label for="tipo-evento" class="mb-2 block text-sm font-medium">Tipo de acción</label><select id="tipo-evento" class={campo} bind:value={accion}><option value="">Todas las acciones</option>{#each acciones as tipo}<option value={tipo}>{titulo(tipo)}</option>{/each}</select></div>
    </div>
    <section aria-labelledby="registro">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="registro" class="text-xl font-semibold">Registro de actividad</h2><span aria-live="polite" class="text-sm text-tezcat-textSecondary">{lista.length} resultados · últimos 100 eventos</span></div>
      <div class="overflow-hidden rounded-xl border border-tezcat-border bg-tezcat-card">
        {#each lista as evento (evento.id)}
          <article class="border-b border-tezcat-border p-5 last:border-b-0 sm:p-6">
            <div class="grid gap-4 md:grid-cols-[155px_1.2fr_1fr_1fr]">
              <time datetime={new Date(evento.creadaEn).toISOString()} class="font-mono text-xs leading-relaxed text-tezcat-textSecondary">{new Date(evento.creadaEn).toLocaleString('es-MX', { dateStyle:'medium', timeStyle:'short' })}</time>
              <div><h3 class="font-semibold text-tezcat-cyan">{titulo(evento.accion)}</h3><p class="mt-1 break-all font-mono text-[11px] text-tezcat-textSecondary">{evento.accion}</p></div>
              <div class="min-w-0"><p class="mb-1 text-xs text-tezcat-textSecondary">Realizado por</p><p class="break-words text-sm">{evento.actorNombre}</p></div>
              <div class="min-w-0"><p class="mb-1 text-xs text-tezcat-textSecondary">Cuenta afectada</p><p class="break-words text-sm">{evento.objetivoNombre ?? 'No aplica'}</p></div>
            </div>
            <details class="mt-4">
              <summary class="w-fit cursor-pointer rounded text-sm font-medium text-tezcat-textSecondary hover:text-tezcat-cyan focus-visible:outline-2 focus-visible:outline-tezcat-cyan">Ver detalle del evento</summary>
              <div class="mt-3 space-y-3 border-t border-tezcat-border pt-4">
                <dl class="grid gap-3 text-xs sm:grid-cols-3"><div><dt class="text-tezcat-textSecondary">Evento</dt><dd class="mt-1 break-all font-mono">{evento.id}</dd></div><div><dt class="text-tezcat-textSecondary">ID de quien realizó la acción</dt><dd class="mt-1 break-all font-mono">{evento.actorId ?? 'No disponible'}</dd></div><div><dt class="text-tezcat-textSecondary">ID de cuenta afectada</dt><dd class="mt-1 break-all font-mono">{evento.usuarioObjetivoId ?? 'No aplica'}</dd></div></dl>
                <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-tezcat-bg p-4 font-mono text-xs leading-relaxed text-tezcat-textPrimary">{JSON.stringify(evento.detalle, null, 2)}</pre>
              </div>
            </details>
          </article>
        {:else}
          <div class="p-10 text-center"><span aria-hidden="true" class="material-symbols-outlined text-3xl text-tezcat-textSecondary">history</span><h3 class="mt-3 font-semibold">{data.eventos.length ? 'No hay eventos con esos filtros' : 'Aún no hay actividad registrada'}</h3><p class="mt-2 text-sm text-tezcat-textSecondary">{data.eventos.length ? 'Busca otra persona o selecciona otro tipo de acción.' : 'Los cambios de usuarios, departamentos y recompensas aparecerán aquí.'}</p>{#if data.eventos.length}<button type="button" onclick={() => { busqueda=''; accion=''; }} class="mt-4 text-sm font-semibold text-tezcat-cyan underline underline-offset-4">Restablecer filtros</button>{/if}</div>
        {/each}
      </div>
      <p class="mt-4 text-sm text-tezcat-textSecondary">Vista de solo lectura. Los filtros se aplican a los 100 eventos más recientes; los registros anteriores permanecen en la base de datos.</p>
    </section>
  </main>
</div>
