<script lang="ts">
  import { page } from '$app/state';

  type Rol = 'ADMIN' | 'ENCARGADO' | 'MIEMBRO';
  let { user }: { user: { nombre: string; rol: string } } = $props();

  // Menú por rol: para agregar una sección, agrega una línea aquí.
  const menus: Record<Rol, [texto: string, href: string][]> = {
    ADMIN: [
      ['Inicio', '/admin'],
      ['Usuarios', '/admin/usuarios'],
      ['Departamentos', '/admin/departamentos'],
      ['Auditoría', '/admin/auditoria'],
      ['Perfil', '/perfil']
    ],
    ENCARGADO: [
      ['Inicio', '/dashboard'],
      ['Equipo', '/equipo'],
      ['Perfil', '/perfil']
    ],
    MIEMBRO: [
      ['Inicio', '/dashboard'],
      ['Perfil', '/perfil']
    ]
  };

  const enlaces = $derived(menus[user.rol as Rol] ?? menus.MIEMBRO);
  // Cada rol tiene su "Inicio": /admin para ADMIN y /dashboard para los demás
  const inicio = $derived(user.rol === 'ADMIN' ? '/admin' : '/dashboard');
  const subtitulo = $derived(user.rol === 'ADMIN' ? 'Consola de Administración' : 'Workflow');
  const activo = (href: string) =>
    href === '/admin' || href === '/dashboard' ? page.url.pathname === href : page.url.pathname.startsWith(href);
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

    <div class="ml-auto flex items-center gap-3">
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