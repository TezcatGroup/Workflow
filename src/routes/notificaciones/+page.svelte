<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type SeccionFiltro = 'TERMINADAS' | 'POR_VENCER' | 'MENSAJERIA' | 'TIENDA';

  const seccionValida = untrack(() => {
    const s = data.seccionInicial;
    if (s === 'TERMINADAS' || s === 'POR_VENCER' || s === 'MENSAJERIA' || s === 'TIENDA') {
      return s;
    }
    return 'TERMINADAS';
  });

  let seccionActiva = $state<SeccionFiltro>(seccionValida);

  // Subfiltros extras (como en Tareas) cuando se selecciona Terminadas, Por vencer o Mensajería
  let busquedaTexto = $state('');
  let filtroRolMiembro = $state<'TODOS' | 'MIEMBRO' | 'ENCARGADO'>('TODOS');
  let filtroNombreMiembro = $state<string>('TODOS');
  let filtroTipoTarea = $state<'TODOS' | 'OBLIGATORIA' | 'OPCIONAL'>('TODOS');

  // Subfiltros extras para Objetos agregados en tienda
  let filtroStockTienda = $state<'TODOS' | 'DISPONIBLES' | 'AGOTADOS'>('TODOS');
  let ordenTienda = $state<'RECIENTES' | 'MENOR_COSTO' | 'MAYOR_COSTO'>('RECIENTES');

  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada',
    EN_PROCESO: 'En proceso',
    EN_REVISION: 'En revisión',
    TERMINADA: 'Terminada'
  };

  const claseEstado: Record<string, string> = {
    ASIGNADA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    EN_PROCESO: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    EN_REVISION: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
    TERMINADA: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
  };

  const fechaCorta = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  function diasRestantes(d: Date | string): number {
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  }

  // Lista única de miembros para el selector extra
  const integrantesUnicos = $derived(
    Array.from(
      new Set(
        [
          ...data.tareas.map((t) => t.responsableNombre),
          ...data.historialMensajeria.map((m) => m.autorNombre)
        ].filter((n): n is string => Boolean(n))
      )
    ).sort()
  );

  // 1. Filtro: Tareas Terminadas
  const tareasTerminadasFiltradas = $derived(
    data.tareas.filter((t) => {
      if (t.estado !== 'TERMINADA') return false;
      const q = busquedaTexto.trim().toLowerCase();
      const coincideTexto =
        !q ||
        t.titulo.toLowerCase().includes(q) ||
        (t.descripcion ?? '').toLowerCase().includes(q) ||
        (t.responsableNombre ?? '').toLowerCase().includes(q);
      const coincideRol =
        filtroRolMiembro === 'TODOS' || (t.responsableRol ?? 'MIEMBRO') === filtroRolMiembro;
      const coincideMiembro =
        filtroNombreMiembro === 'TODOS' || t.responsableNombre === filtroNombreMiembro;
      const coincideTipo = filtroTipoTarea === 'TODOS' || t.tipo === filtroTipoTarea;
      return coincideTexto && coincideRol && coincideMiembro && coincideTipo;
    })
  );

  // 2. Filtro: Tareas por Vencer (próximas a vencer en <= 3 días o vencidas sin terminar)
  const tareasPorVencerFiltradas = $derived(
    data.tareas.filter((t) => {
      if (t.estado === 'TERMINADA') return false;
      if (diasRestantes(t.fechaLimite) > 3) return false;
      const q = busquedaTexto.trim().toLowerCase();
      const coincideTexto =
        !q ||
        t.titulo.toLowerCase().includes(q) ||
        (t.descripcion ?? '').toLowerCase().includes(q) ||
        (t.responsableNombre ?? '').toLowerCase().includes(q);
      const coincideRol =
        filtroRolMiembro === 'TODOS' || (t.responsableRol ?? 'MIEMBRO') === filtroRolMiembro;
      const coincideMiembro =
        filtroNombreMiembro === 'TODOS' || t.responsableNombre === filtroNombreMiembro;
      const coincideTipo = filtroTipoTarea === 'TODOS' || t.tipo === filtroTipoTarea;
      return coincideTexto && coincideRol && coincideMiembro && coincideTipo;
    })
  );

  // 3. Filtro: Mensajería
  const mensajeriaFiltrada = $derived(
    data.historialMensajeria.filter((m) => {
      const q = busquedaTexto.trim().toLowerCase();
      const coincideTexto =
        !q ||
        m.contenido.toLowerCase().includes(q) ||
        m.tareaTitulo.toLowerCase().includes(q) ||
        m.autorNombre.toLowerCase().includes(q);
      const coincideRol = filtroRolMiembro === 'TODOS' || m.autorRol === filtroRolMiembro;
      const coincideMiembro =
        filtroNombreMiembro === 'TODOS' ||
        m.autorNombre === filtroNombreMiembro ||
        m.responsableNombre === filtroNombreMiembro;
      return coincideTexto && coincideRol && coincideMiembro;
    })
  );

  // 4. Filtro: Objetos agregados en tienda
  const objetosTiendaFiltrados = $derived(
    data.objetosTienda
      .filter((item) => {
        const q = busquedaTexto.trim().toLowerCase();
        const coincideTexto =
          !q ||
          item.nombre.toLowerCase().includes(q) ||
          (item.descripcion ?? '').toLowerCase().includes(q);
        const agotado = item.stock !== null && item.stock <= 0;
        const coincideStock =
          filtroStockTienda === 'TODOS' ||
          (filtroStockTienda === 'DISPONIBLES' ? !agotado : agotado);
        return coincideTexto && coincideStock;
      })
      .sort((a, b) => {
        if (ordenTienda === 'MENOR_COSTO') return a.costoPuntos - b.costoPuntos;
        if (ordenTienda === 'MAYOR_COSTO') return b.costoPuntos - a.costoPuntos;
        return new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime();
      })
  );

  const conteosTotales = $derived({
    terminadas: data.tareas.filter((t) => t.estado === 'TERMINADA').length,
    porVencer: data.tareas.filter(
      (t) => t.estado !== 'TERMINADA' && diasRestantes(t.fechaLimite) <= 3
    ).length,
    mensajeria: data.historialMensajeria.length,
    tienda: data.objetosTienda.length
  });

  function restablecerSubfiltros() {
    busquedaTexto = '';
    filtroRolMiembro = 'TODOS';
    filtroNombreMiembro = 'TODOS';
    filtroTipoTarea = 'TODOS';
    filtroStockTienda = 'TODOS';
    ordenTienda = 'RECIENTES';
  }
</script>

<svelte:head>
  <title>Notificaciones | Tezcat Workflow</title>
</svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    <!-- Encabezado principal -->
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
          Sprint 10 · Centro de Notificaciones y Seguimiento
        </p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Notificaciones y Actividad
        </h1>
        <p class="mt-1.5 text-xs text-tezcat-textSecondary">
          Consulta tus últimas notificaciones y filtra entre tareas terminadas, tareas por vencer, mensajería y objetos agregados en tienda.
        </p>
      </div>

      <form method="POST" action="?/ejecutarScheduler" use:enhance>
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-xl border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-3.5 py-2 text-xs font-semibold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
        >
          <span class="material-symbols-outlined text-base">schedule_send</span>
          Verificar tareas por vencer ahora
        </button>
      </form>
    </div>

    {#if form?.mensaje}
      <div
        role="status"
        class="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs text-emerald-300"
      >
        <span class="material-symbols-outlined text-base">check_circle</span>
        <span>{form.mensaje}</span>
      </div>
    {/if}

    <!-- =============================================================== -->
    <!-- PANEL DE ÚLTIMAS NOTIFICACIONES RECIBIDAS                       -->
    <!-- =============================================================== -->
    <section class="mb-8 rounded-2xl border border-tezcat-border bg-tezcat-card/90 p-5 shadow-xl">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-lg text-tezcat-cyan">notifications_active</span>
          <h2 class="text-sm font-bold tracking-wide text-white uppercase">
            Últimas Notificaciones ({data.notificaciones.length})
          </h2>
          {#if data.noLeidas > 0}
            <span class="rounded-full bg-tezcat-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold text-tezcat-cyan">
              {data.noLeidas} sin leer
            </span>
          {/if}
        </div>

        {#if data.noLeidas > 0}
          <form method="POST" action="?/marcarTodasLeidas" use:enhance>
            <button
              type="submit"
              class="font-mono text-xs font-semibold text-tezcat-cyan hover:underline"
            >
              Marcar todas como leídas
            </button>
          </form>
        {/if}
      </div>

      {#if data.notificaciones.length === 0}
        <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-6 text-center text-xs text-tezcat-textSecondary">
          No tienes notificaciones registradas todavía.
        </div>
      {:else}
        <ul class="max-h-80 space-y-2.5 overflow-y-auto pr-1">
          {#each data.notificaciones as n (n.id)}
            <li
              class="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3.5 transition-colors
                {!n.leida
                  ? 'border-tezcat-cyan/40 bg-tezcat-cyan/5'
                  : 'border-tezcat-border bg-tezcat-bg/60 opacity-80'}"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  {#if !n.leida}
                    <span class="rounded bg-tezcat-cyan px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-950 uppercase">
                      Nueva
                    </span>
                  {/if}
                  <p class="truncate text-xs font-bold text-white">{n.titulo}</p>
                  <span class="font-mono text-[10px] text-tezcat-textMuted">
                    · {fechaCorta(n.creadaEn)}
                  </span>
                </div>
                {#if n.tareaTitulo}
                  <p class="mt-0.5 font-mono text-[10px] font-semibold text-tezcat-cyan">
                    Actividad: {n.tareaTitulo}
                  </p>
                {/if}
                <p class="mt-1 text-xs text-tezcat-textSecondary">{n.mensaje}</p>
              </div>

              <div class="flex items-center gap-2">
                {#if n.enlace || n.tareaId}
                  <a
                    href={n.enlace || `/tareas/${n.tareaId}`}
                    class="rounded-xl border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-tezcat-cyan hover:bg-tezcat-cyan/20"
                  >
                    Ver actividad
                  </a>
                {/if}

                {#if !n.leida}
                  <form method="POST" action="?/marcarLeida" use:enhance>
                    <input type="hidden" name="notificacionId" value={n.id} />
                    <button
                      type="submit"
                      class="rounded-xl border border-tezcat-border bg-tezcat-surfaceAlt px-3 py-1.5 font-mono text-[11px] text-tezcat-textSecondary hover:text-white"
                    >
                      Leída
                    </button>
                  </form>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- =============================================================== -->
    <!-- BARRA DE FILTROS PRINCIPALES + SUBFILTROS CONTEXTUALES          -->
    <!-- =============================================================== -->
    <div class="mb-6 rounded-2xl border border-tezcat-border bg-tezcat-card/90 p-4 shadow-xl sm:p-5">
      <!-- 4 Filtros Principales Solicitados -->
      <div class="flex flex-wrap gap-2.5">
        <button
          type="button"
          onclick={() => (seccionActiva = 'TERMINADAS')}
          class="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold transition-colors
            {seccionActiva === 'TERMINADAS'
              ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
              : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
        >
          <span class="material-symbols-outlined text-base">task_alt</span>
          Tareas terminadas ({conteosTotales.terminadas})
        </button>

        <button
          type="button"
          onclick={() => (seccionActiva = 'POR_VENCER')}
          class="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold transition-colors
            {seccionActiva === 'POR_VENCER'
              ? 'border-amber-400 bg-amber-400/15 text-amber-300'
              : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
        >
          <span class="material-symbols-outlined text-base">alarm</span>
          Tareas por vencer ({conteosTotales.porVencer})
        </button>

        <button
          type="button"
          onclick={() => (seccionActiva = 'MENSAJERIA')}
          class="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold transition-colors
            {seccionActiva === 'MENSAJERIA'
              ? 'border-tezcat-cyan bg-tezcat-cyan/15 text-tezcat-cyan'
              : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
        >
          <span class="material-symbols-outlined text-base">forum</span>
          Mensajería ({conteosTotales.mensajeria})
        </button>

        <button
          type="button"
          onclick={() => (seccionActiva = 'TIENDA')}
          class="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold transition-colors
            {seccionActiva === 'TIENDA'
              ? 'border-purple-400 bg-purple-400/15 text-purple-300'
              : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
        >
          <span class="material-symbols-outlined text-base">storefront</span>
          Objetos en tienda ({conteosTotales.tienda})
        </button>
      </div>

      <!-- Filtros extras dinámicos según la pestaña seleccionada -->
      {#if seccionActiva === 'TERMINADAS' || seccionActiva === 'POR_VENCER' || seccionActiva === 'MENSAJERIA'}
        <div class="mt-4 grid gap-3 border-t border-tezcat-border/70 pt-4 sm:grid-cols-4">
          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              filter_alt
            </span>
            <input
              type="search"
              bind:value={busquedaTexto}
              placeholder="Filtrar por nombre de actividad o mensaje…"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
            />
          </div>

          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              badge
            </span>
            <select
              bind:value={filtroRolMiembro}
              aria-label="Filtrar por tipo de miembro"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
            >
              <option value="TODOS">Todos los tipos de miembro</option>
              <option value="MIEMBRO">Rol: Miembro</option>
              <option value="ENCARGADO">Rol: Encargado</option>
            </select>
          </div>

          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              person
            </span>
            <select
              bind:value={filtroNombreMiembro}
              aria-label="Filtrar por integrante específico"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
            >
              <option value="TODOS">Todos los integrantes ({integrantesUnicos.length})</option>
              {#each integrantesUnicos as nombre (nombre)}
                <option value={nombre}>{nombre}</option>
              {/each}
            </select>
          </div>

          {#if seccionActiva !== 'MENSAJERIA'}
            <div class="relative">
              <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
                category
              </span>
              <select
                bind:value={filtroTipoTarea}
                aria-label="Filtrar por modalidad de tarea"
                class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
              >
                <option value="TODOS">Obligatorias y Opcionales</option>
                <option value="OBLIGATORIA">Obligatorias</option>
                <option value="OPCIONAL">Opcionales (Muro)</option>
              </select>
            </div>
          {:else}
            <div class="flex items-center">
              <button
                type="button"
                onclick={restablecerSubfiltros}
                class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 text-xs font-semibold text-tezcat-cyan transition-colors hover:border-tezcat-cyan/50"
              >
                Restablecer filtros
              </button>
            </div>
          {/if}
        </div>
      {:else if seccionActiva === 'TIENDA'}
        <div class="mt-4 grid gap-3 border-t border-tezcat-border/70 pt-4 sm:grid-cols-3">
          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              redeem
            </span>
            <input
              type="search"
              bind:value={busquedaTexto}
              placeholder="Filtrar objetos de la tienda por nombre…"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none"
            />
          </div>

          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              inventory_2
            </span>
            <select
              bind:value={filtroStockTienda}
              aria-label="Filtrar por disponibilidad en tienda"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
            >
              <option value="TODOS">Todos los objetos</option>
              <option value="DISPONIBLES">Con stock disponible</option>
              <option value="AGOTADOS">Agotados</option>
            </select>
          </div>

          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-tezcat-textMuted">
              sort
            </span>
            <select
              bind:value={ordenTienda}
              aria-label="Ordenar objetos de tienda"
              class="w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2 pr-3 pl-9 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
            >
              <option value="RECIENTES">Agregados recientemente</option>
              <option value="MENOR_COSTO">Menor costo en monedas</option>
              <option value="MAYOR_COSTO">Mayor costo en monedas</option>
            </select>
          </div>
        </div>
      {/if}
    </div>

    <!-- =============================================================== -->
    <!-- CONTENIDO DE LA SECCIÓN SELECCIONADA                            -->
    <!-- =============================================================== -->
    {#if seccionActiva === 'TERMINADAS'}
      <section>
        <h2 class="mb-3 text-sm font-bold tracking-wide text-white uppercase">
          Tareas Terminadas ({tareasTerminadasFiltradas.length})
        </h2>

        {#if tareasTerminadasFiltradas.length === 0}
          <div class="rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/50 p-10 text-center">
            <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">task_alt</span>
            <p class="mt-2 text-sm font-semibold text-white">No hay tareas terminadas con este filtro</p>
          </div>
        {:else}
          <ul class="space-y-3">
            {#each tareasTerminadasFiltradas as t (t.id)}
              <li class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 transition-all hover:border-emerald-400/50">
                <a href="/tareas/{t.id}" class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded border border-tezcat-border bg-tezcat-surfaceAlt px-1.5 py-0.5 font-mono text-[10px] text-tezcat-textSecondary uppercase">
                      {t.tipo}
                    </span>
                    {#if t.responsableRol}
                      <span class="rounded border border-tezcat-cyan/30 bg-tezcat-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-tezcat-cyan uppercase">
                        {t.responsableRol}
                      </span>
                    {/if}
                  </div>

                  <p class="mt-1.5 truncate text-sm font-bold text-white hover:text-tezcat-cyan">
                    {t.titulo}
                  </p>

                  <div class="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-tezcat-textMuted">
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">person</span>
                      {t.responsableNombre ?? 'Sin asignar'}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">event_available</span>
                      Finalizada: {fechaCorta(t.actualizadoEn)}
                    </span>
                  </div>
                </a>

                <a
                  href="/tareas/{t.id}"
                  class="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase {claseEstado[t.estado] ?? ''}"
                >
                  {textoEstado[t.estado] ?? t.estado}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if seccionActiva === 'POR_VENCER'}
      <section>
        <h2 class="mb-3 text-sm font-bold tracking-wide text-white uppercase">
          Tareas por Vencer o Vencidas ({tareasPorVencerFiltradas.length})
        </h2>

        {#if tareasPorVencerFiltradas.length === 0}
          <div class="rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/50 p-10 text-center">
            <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">alarm_on</span>
            <p class="mt-2 text-sm font-semibold text-white">No hay tareas próximas a vencer con este filtro</p>
          </div>
        {:else}
          <ul class="space-y-3">
            {#each tareasPorVencerFiltradas as t (t.id)}
              {@const dias = diasRestantes(t.fechaLimite)}
              <li class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 transition-all hover:border-amber-400/50">
                <a href="/tareas/{t.id}" class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1 rounded border border-red-400/40 bg-red-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 uppercase">
                      <span class="material-symbols-outlined text-xs">alarm</span>
                      {dias < 0 ? `Vencida hace ${Math.abs(dias)} d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}
                    </span>
                    <span class="rounded border border-tezcat-border bg-tezcat-surfaceAlt px-1.5 py-0.5 font-mono text-[10px] text-tezcat-textSecondary uppercase">
                      {t.tipo}
                    </span>
                    {#if t.responsableRol}
                      <span class="rounded border border-tezcat-cyan/30 bg-tezcat-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-tezcat-cyan uppercase">
                        {t.responsableRol}
                      </span>
                    {/if}
                  </div>

                  <p class="mt-1.5 truncate text-sm font-bold text-white hover:text-tezcat-cyan">
                    {t.titulo}
                  </p>

                  <div class="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-tezcat-textMuted">
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">person</span>
                      {t.responsableNombre ?? 'En el Muro (Sin asignar)'}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">event</span>
                      Fecha límite: {fechaCorta(t.fechaLimite)}
                    </span>
                  </div>
                </a>

                <a
                  href="/tareas/{t.id}"
                  class="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase {claseEstado[t.estado] ?? ''}"
                >
                  {textoEstado[t.estado] ?? t.estado}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if seccionActiva === 'MENSAJERIA'}
      <section>
        <h2 class="mb-3 text-sm font-bold tracking-wide text-white uppercase">
          Mensajería en Actividades ({mensajeriaFiltrada.length})
        </h2>

        {#if mensajeriaFiltrada.length === 0}
          <div class="rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/40 p-10 text-center text-xs text-tezcat-textSecondary">
            No se encontraron mensajes con el filtro seleccionado.
          </div>
        {:else}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each mensajeriaFiltrada as msg (msg.id)}
              <a
                href="/tareas/{msg.tareaId}#conversacion"
                class="flex flex-col justify-between rounded-2xl border border-tezcat-border bg-tezcat-card/90 p-4 transition-colors hover:border-tezcat-cyan/50"
              >
                <div>
                  <div class="flex items-center justify-between gap-2 font-mono text-[10px]">
                    <span class="truncate font-bold text-tezcat-cyan">
                      {msg.tareaTitulo}
                    </span>
                    <span class="shrink-0 text-tezcat-textMuted">{fechaCorta(msg.creadoEn)}</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-xs text-tezcat-textPrimary">
                    "{msg.contenido}"
                  </p>
                </div>
                <p class="mt-2.5 font-mono text-[10px] text-tezcat-textSecondary">
                  Enviado por <strong class="text-white">{msg.autorNombre}</strong>
                  <span class="rounded bg-tezcat-surfaceAlt px-1.5 py-0.5 text-[9px] text-tezcat-cyan uppercase">
                    {msg.autorRol}
                  </span>
                </p>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    {:else if seccionActiva === 'TIENDA'}
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold tracking-wide text-white uppercase">
            Objetos Agregados en Tienda ({objetosTiendaFiltrados.length})
          </h2>
          <a
            href="/tienda"
            class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-tezcat-cyan hover:underline"
          >
            Ir a la tienda para canjear
            <span class="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        </div>

        {#if objetosTiendaFiltrados.length === 0}
          <div class="rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/40 p-10 text-center text-xs text-tezcat-textSecondary">
            No hay objetos registrados en la tienda con ese criterio.
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each objetosTiendaFiltrados as item (item.id)}
              {@const agotado = item.stock !== null && item.stock <= 0}
              <div class="flex flex-col justify-between rounded-2xl border border-tezcat-border bg-tezcat-card/90 p-4 shadow-md">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="text-sm font-bold text-white">{item.nombre}</h3>
                    <span class="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                      {item.costoPuntos} monedas
                    </span>
                  </div>

                  {#if item.descripcion}
                    <p class="mt-1.5 line-clamp-2 text-xs text-tezcat-textSecondary">
                      {item.descripcion}
                    </p>
                  {/if}
                </div>

                <div class="mt-4 flex items-center justify-between border-t border-tezcat-border/60 pt-2.5 font-mono text-[10px]">
                  <span class={agotado ? 'text-red-300' : 'text-emerald-300'}>
                    {item.stock === null
                      ? 'Stock ilimitado'
                      : agotado
                        ? 'Agotado'
                        : `Stock disponible: ${item.stock}`}
                  </span>
                  <span class="text-tezcat-textMuted">
                    {fechaCorta(item.creadaEn)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </main>
</div>