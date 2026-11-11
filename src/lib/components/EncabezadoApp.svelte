<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  type Rol = 'ADMIN' | 'ENCARGADO' | 'MIEMBRO';
  let { user }: { user: { nombre: string; rol: string } } = $props();

  type ItemNotificacion = {
    id: string;
    tareaId: string | null;
    titulo: string;
    mensaje: string;
    enlace: string | null;
    leida: boolean;
    creadaEn: string;
    tareaTitulo?: string | null;
    tareaEstado?: string | null;
  };

  // Menú por rol (sin opción "Buscar" para ningún usuario)
  const menus: Record<Rol, [texto: string, href: string][]> = {
    ADMIN: [
      ['Inicio', '/admin'],
      ['Tareas', '/tareas'],
      ['Usuarios', '/admin/usuarios'],
      ['Departamentos', '/admin/departamentos'],
      ['Etiquetas', '/admin/etiquetas'],
      ['Recompensas', '/admin/recompensas'],
      ['Auditoría', '/admin/auditoria'],
      ['Perfil', '/perfil']
    ],
    ENCARGADO: [
      ['Inicio', '/dashboard'],
      ['Tareas', '/tareas'],
      ['Muro', '/muro'],
      ['Tienda', '/tienda'],
      ['Equipo', '/equipo'],
      ['Perfil', '/perfil']
    ],
    MIEMBRO: [
      ['Inicio', '/dashboard'],
      ['Tareas', '/tareas'],
      ['Muro', '/muro'],
      ['Tienda', '/tienda'],
      ['Perfil', '/perfil']
    ]
  };

  const enlaces = $derived(menus[user.rol as Rol] ?? menus.MIEMBRO);
  const inicio = $derived(user.rol === 'ADMIN' ? '/admin' : '/dashboard');
  const subtitulo = $derived(user.rol === 'ADMIN' ? 'Consola de Administración' : 'Workflow');
  const activo = (href: string) =>
    href === '/admin' || href === '/dashboard' ? page.url.pathname === href : page.url.pathname.startsWith(href);

  // =========================================================================
  // TW-23: Estado reactivo del Centro de Notificaciones (Solo Encargado/Miembro)
  // =========================================================================
  let menuAbierto = $state(false);
  let cargandoNotificaciones = $state(false);
  let noLeidas = $state(0);
  let listaNotificaciones = $state<ItemNotificacion[]>([]);

  async function cargarNotificaciones() {
    if (user.rol === 'ADMIN') return;
    try {
      cargandoNotificaciones = true;
      const res = await fetch('/api/notificaciones');
      if (!res.ok) return;
      const datos = await res.json();
      noLeidas = datos.noLeidas ?? 0;
      listaNotificaciones = datos.notificaciones ?? [];
    } catch {
      // Silencioso en caso de desconexión momentánea
    } finally {
      cargandoNotificaciones = false;
    }
  }

  async function marcarTodasComoLeidas() {
    const res = await fetch('/api/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todas: true })
    });
    if (res.ok) {
      const datos = await res.json();
      noLeidas = datos.noLeidas ?? 0;
      listaNotificaciones = datos.notificaciones ?? [];
    }
  }

  async function abrirNotificacion(item: ItemNotificacion) {
    if (!item.leida) {
      fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionId: item.id })
      }).catch(() => {});
      item.leida = true;
      noLeidas = Math.max(0, noLeidas - 1);
    }
    menuAbierto = false;
    const destino = item.enlace || (item.tareaId ? `/tareas/${item.tareaId}` : '/tareas');
    await goto(destino);
  }

  function alternarCampanita() {
    menuAbierto = !menuAbierto;
    if (menuAbierto) {
      cargarNotificaciones();
    }
  }

  function iconoPorNotificacion(titulo: string): { icono: string; clase: string } {
    const t = titulo.toLowerCase();
    if (t.includes('vencida') || t.includes('denegada')) {
      return { icono: 'warning', clase: 'border-red-400/40 bg-red-400/15 text-red-300' };
    }
    if (t.includes('por vencer') || t.includes('devuelta') || t.includes('reasignación')) {
      return { icono: 'schedule', clase: 'border-amber-400/40 bg-amber-400/15 text-amber-300' };
    }
    if (t.includes('aprobada')) {
      return { icono: 'task_alt', clase: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' };
    }
    if (t.includes('mensaje')) {
      return { icono: 'forum', clase: 'border-tezcat-cyan/40 bg-tezcat-cyan/15 text-tezcat-cyan' };
    }
    if (t.includes('recurso') || t.includes('archivo')) {
      return { icono: 'attach_file', clase: 'border-purple-400/40 bg-purple-400/15 text-purple-300' };
    }
    return { icono: 'notifications', clase: 'border-tezcat-cyan/40 bg-tezcat-cyan/15 text-tezcat-cyan' };
  }

  function tiempoRelativo(fechaIso: string): string {
    const diffSeg = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 1000);
    if (diffSeg < 60) return 'Hace un momento';
    const min = Math.floor(diffSeg / 60);
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const dias = Math.floor(hrs / 24);
    return `Hace ${dias} d`;
  }

  $effect(() => {
    if (user.rol !== 'ADMIN') {
      cargarNotificaciones();
      const intervalo = setInterval(cargarNotificaciones, 25_000);
      return () => clearInterval(intervalo);
    }
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    rel="stylesheet"
  />
</svelte:head>

<header class="sticky top-0 z-50 border-b border-tezcat-border bg-tezcat-bg/90 backdrop-blur-xl">
  <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
    <a href={inicio} class="flex items-center gap-3">
      <span class="flex size-9 items-center justify-center rounded-lg bg-tezcat-surfaceAlt text-tezcat-cyan">
        <span class="material-symbols-outlined text-xl">terminal</span>
      </span>
      <span class="leading-tight">
        <span class="block font-bold tracking-wide uppercase">Tezcat</span>
        <span class="block font-mono text-[10px] tracking-widest text-tezcat-textSecondary uppercase">{subtitulo}</span>
      </span>
    </a>

    <!-- En móvil baja a una segunda fila con scroll horizontal -->
    <nav aria-label="Principal" class="order-last flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
      {#each enlaces as [texto, href] (href)}
        <a
          {href}
          aria-current={activo(href) ? 'page' : undefined}
          class="rounded-md px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors {activo(href)
            ? 'bg-tezcat-surfaceAlt text-tezcat-cyan'
            : 'text-tezcat-textSecondary hover:bg-tezcat-surface hover:text-tezcat-textPrimary'}"
        >
          {texto}
        </a>
      {/each}
    </nav>

    <div class="ml-auto flex items-center gap-2.5">
      <!-- TW-23: Campanita exclusiva para ENCARGADO y MIEMBRO (Oculta para ADMIN) -->
      {#if user.rol !== 'ADMIN'}
        <div class="relative">
          <button
            type="button"
            onclick={alternarCampanita}
            aria-label="Abrir centro de notificaciones"
            aria-expanded={menuAbierto}
            class="relative inline-flex size-9 items-center justify-center rounded-lg border transition-colors
              {menuAbierto
                ? 'border-tezcat-cyan bg-tezcat-cyan/15 text-tezcat-cyan'
                : 'border-tezcat-border bg-tezcat-surfaceAlt/80 text-tezcat-textSecondary hover:border-tezcat-cyan/50 hover:text-tezcat-cyan'}"
          >
            <span class="material-symbols-outlined text-lg">notifications</span>
            {#if noLeidas > 0}
              <span
                class="absolute -top-1.5 -right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-tezcat-cyan px-1 py-0.2 font-mono text-[10px] font-extrabold text-slate-950 shadow-md"
              >
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            {/if}
          </button>

          {#if menuAbierto}
            <div
              role="presentation"
              onclick={() => (menuAbierto = false)}
              class="fixed inset-0 z-40"
            ></div>

            <div
              class="absolute right-0 z-50 mt-2.5 w-84 overflow-hidden rounded-2xl border border-tezcat-border bg-tezcat-card shadow-2xl sm:w-96"
            >
              <div class="flex items-center justify-between border-b border-tezcat-border bg-tezcat-bg/90 px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-tezcat-cyan">notifications_active</span>
                  <h2 class="text-xs font-bold tracking-wide text-white uppercase">
                    Centro de Avisos
                  </h2>
                  {#if noLeidas > 0}
                    <span class="rounded-full bg-tezcat-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold text-tezcat-cyan">
                      {noLeidas} nueva{noLeidas === 1 ? '' : 's'}
                    </span>
                  {/if}
                </div>

                {#if noLeidas > 0}
                  <button
                    type="button"
                    onclick={marcarTodasComoLeidas}
                    class="font-mono text-[10px] font-semibold text-tezcat-cyan hover:underline"
                  >
                    Marcar leídas
                  </button>
                {/if}
              </div>

              <div class="max-h-96 divide-y divide-tezcat-border/60 overflow-y-auto">
                {#if cargandoNotificaciones && listaNotificaciones.length === 0}
                  <div class="p-6 text-center text-xs text-tezcat-textMuted">
                    Cargando notificaciones…
                  </div>
                {:else if listaNotificaciones.length === 0}
                  <div class="flex flex-col items-center justify-center px-5 py-10 text-center">
                    <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">notifications_off</span>
                    <p class="mt-2 text-xs font-semibold text-tezcat-textPrimary">
                      No tienes notificaciones pendientes
                    </p>
                    <p class="mt-1 text-[11px] text-tezcat-textSecondary">
                      Aquí aparecerán los mensajes del chat de tus tareas y los avisos de actividades por vencer.
                    </p>
                  </div>
                {:else}
                  {#each listaNotificaciones as item (item.id)}
                    {@const visual = iconoPorNotificacion(item.titulo)}
                    <button
                      type="button"
                      onclick={() => abrirNotificacion(item)}
                      class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-tezcat-surfaceAlt/70
                        {!item.leida ? 'bg-tezcat-cyan/5' : 'opacity-75'}"
                    >
                      <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border {visual.clase}">
                        <span class="material-symbols-outlined text-base">{visual.icono}</span>
                      </span>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                          <p class="truncate text-xs font-bold {!item.leida ? 'text-white' : 'text-tezcat-textSecondary'}">
                            {item.titulo}
                          </p>
                          {#if !item.leida}
                            <span class="size-2 shrink-0 rounded-full bg-tezcat-cyan"></span>
                          {/if}
                        </div>

                        {#if item.tareaTitulo}
                          <p class="mt-0.5 truncate font-mono text-[10px] font-semibold text-tezcat-cyan">
                            Actividad: {item.tareaTitulo}
                          </p>
                        {/if}

                        <p class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-tezcat-textSecondary">
                          {item.mensaje}
                        </p>

                        <p class="mt-1 font-mono text-[10px] text-tezcat-textMuted">
                          {tiempoRelativo(item.creadaEn)}
                        </p>
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>

              <div class="border-t border-tezcat-border bg-tezcat-bg/90 px-4 py-2.5 text-center">
                <a
                  href="/notificaciones"
                  onclick={() => (menuAbierto = false)}
                  class="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-tezcat-cyan hover:underline"
                >
                  <span>Ver todas las notificaciones</span>
                  <span class="material-symbols-outlined text-xs">arrow_forward</span>
                </a>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="hidden text-right leading-tight sm:block">
        <p class="text-sm font-semibold">{user.nombre}</p>
        <p class="font-mono text-[10px] tracking-wider text-tezcat-gold uppercase">{user.rol}</p>
      </div>

      <!-- /logout solo acepta POST, por eso es un formulario -->
      <form method="POST" action="/logout">
        <button
          type="submit"
          title="Cerrar sesión"
          class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-xs text-tezcat-textSecondary uppercase transition-colors hover:bg-tezcat-surface hover:text-tezcat-gold"
        >
          <span class="material-symbols-outlined text-lg">logout</span>
          <span class="hidden md:inline">Salir</span>
        </button>
      </form>
    </div>
  </div>
</header>