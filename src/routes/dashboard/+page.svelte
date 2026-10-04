<script lang="ts">
  import type { PageData } from './$types';
  import { SvelteSet } from 'svelte/reactivity';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import TarjetaMetrica from '$lib/components/TarjetaMetrica.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data }: { data: PageData } = $props();

  // Los datos del dashboard llegan desde +page.server.ts
  const { perfil, kpis, tareas, misiones } = $derived(data);
  type Prioridad = PageData['tareas'][number]['prioridad'];
  type Tono = PageData['kpis'][number]['tono'];

  type Def = {
    titulo: string;
    descripcion: string;
    icono: string;
    href: string;
    acento: 'cyan' | 'gold';
    metrica?: string; // clave dentro de data.metricas
    etiqueta?: string;
  };

  // Catálogo de widgets. El servidor decide cuáles se muestran (data.widgets);
  // aquí solo se define cómo se ve cada uno. Widget nuevo = una entrada nueva.
  const catalogo: Record<string, Def> = {
    usuarios: {
      titulo: 'Usuarios', descripcion: 'Cuentas, roles y estado de acceso',
      icono: 'badge', href: '/admin/usuarios', acento: 'cyan', metrica: 'usuarios', etiqueta: 'registrados'
    },
    departamentos: {
      titulo: 'Departamentos', descripcion: 'Áreas de la organización',
      icono: 'hub', href: '/admin/departamentos', acento: 'gold', metrica: 'departamentos', etiqueta: 'áreas'
    },
    auditoria: {
      titulo: 'Auditoría', descripcion: 'Bitácora de cambios administrativos',
      icono: 'fact_check', href: '/admin/auditoria', acento: 'cyan'
    },
    equipo: {
      titulo: 'Mi equipo', descripcion: 'Miembros activos de tu departamento',
      icono: 'groups', href: '/equipo', acento: 'cyan', metrica: 'miembrosActivos', etiqueta: 'activos'
    },
    perfil: {
      titulo: 'Mi perfil', descripcion: 'Tus datos y tu departamento',
      icono: 'person', href: '/perfil', acento: 'gold'
    }
  };

  const subtitulos: Record<string, string> = {
    ADMIN: 'Consola de administración',
    ENCARGADO: 'Panel de encargado de departamento',
    MIEMBRO: 'Panel de miembro'
  };

  const metricas = $derived(data.metricas as Record<string, number | undefined>);
  const tarjetas = $derived(
    data.widgets
      .filter((id) => id in catalogo)
      .map((id) => {
        const d = catalogo[id];
        return { id, ...d, valor: d.metrica ? metricas[d.metrica] : undefined };
      })
  );

  // ── Estilos por variante (clases completas para que Tailwind las detecte) ──
  const tonos: Record<Tono, { caja: string; titulo: string; icono: string; valor: string; pie: string }> = {
    normal: {
      caja: 'border-tezcat-border hover:bg-tezcat-surface', titulo: 'text-tezcat-textSecondary',
      icono: 'text-tezcat-textSecondary', valor: 'text-tezcat-textPrimary',
      pie: 'border-tezcat-border text-tezcat-textSecondary'
    },
    cian: {
      caja: 'border-tezcat-border hover:bg-tezcat-surface', titulo: 'text-tezcat-textSecondary',
      icono: 'text-tezcat-cyan', valor: 'text-tezcat-textPrimary', pie: 'border-tezcat-border text-tezcat-cyan'
    },
    alerta: {
      caja: 'border-tezcat-danger/50', titulo: 'text-tezcat-danger',
      icono: 'text-tezcat-danger motion-safe:animate-bounce', valor: 'text-tezcat-danger',
      pie: 'border-tezcat-danger/30 text-tezcat-danger'
    }
  };

  const prioridades: Record<Prioridad, { texto: string; barra: string; etiqueta: string; hover: string }> = {
    critica: {
      texto: 'Crítico / urgente', barra: 'bg-tezcat-danger',
      etiqueta: 'bg-tezcat-danger/15 text-tezcat-danger', hover: 'hover:border-tezcat-danger/60'
    },
    progreso: {
      texto: 'En progreso', barra: 'bg-tezcat-cyan',
      etiqueta: 'bg-tezcat-surfaceAlt text-tezcat-cyan', hover: 'hover:border-tezcat-cyan/40'
    },
    cola: {
      texto: 'En cola', barra: 'bg-tezcat-borderHighlight',
      etiqueta: 'bg-tezcat-surfaceAlt text-tezcat-textSecondary', hover: 'hover:border-tezcat-borderHighlight'
    }
  };

  // ── Progreso de XP ──
  const xpPct = $derived(Math.round((perfil.xp / perfil.xpMeta) * 100));
  const xpFalta = $derived(perfil.xpMeta - perfil.xp);
  const num = (n: number) => n.toLocaleString('es-MX');
  const iniciales = (nombre: string) =>
    nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  // ── Interacción ──
  const hechas = new SvelteSet<string>();
  const aceptadas = new SvelteSet<string>();
  let aviso = $state(false);
  let resaltar = $state(false);
  let listaMisiones: HTMLUListElement | undefined = $state();

  const alternar = (id: string) => (hechas.has(id) ? hechas.delete(id) : hechas.add(id));

  function aceptar(id: string) {
    if (aceptadas.has(id)) return;
    aceptadas.add(id);
    aviso = true;
    setTimeout(() => (aviso = false), 3000);
  }

  function reclamar() {
    listaMisiones?.querySelector('button')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    resaltar = true;
    setTimeout(() => (resaltar = false), 1500);
  }
</script>

<svelte:head>
  <title>Inicio · Tezcat Workflow</title>
</svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-7xl space-y-6 px-4 py-6">
    <!-- Perfil -->
    <section class="relative overflow-hidden rounded-xl border border-tezcat-border bg-tezcat-card p-6 shadow-xl">
      <div class="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full bg-tezcat-cyan/5 blur-3xl"></div>

      <div class="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <div class="flex min-w-0 items-center gap-5">
          <div class="relative shrink-0">
            <span class="flex size-20 items-center justify-center rounded-xl bg-tezcat-surfaceAlt font-mono text-2xl font-bold text-tezcat-cyan ring-2 ring-tezcat-cyan/30">
              {iniciales(data.user.nombre)}
            </span>
            <span class="absolute -right-1 -bottom-1 flex items-center gap-1 rounded border border-tezcat-cyan/40 bg-tezcat-bg px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-tezcat-cyan">
              <span class="size-1.5 rounded-full bg-tezcat-cyan motion-safe:animate-pulse"></span>ONLINE
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
              <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-gold">Rol: {data.user.rol}</span>
              <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-cyan">{perfil.rango}</span>
            </div>
            <h1 class="mt-2 text-3xl font-bold tracking-tight">¡Bienvenido de nuevo, {data.user.nombre}!</h1>
            <p class="mt-1 text-sm text-tezcat-textSecondary">{subtitulos[data.user.rol] ?? ''}</p>
            <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              <span class="flex items-center gap-1.5 text-tezcat-gold">
                <span class="material-symbols-outlined text-sm">local_fire_department</span>
                {perfil.racha} días completando objetivos
              </span>
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-tezcat-cyan">task_alt</span>
                Cuota diaria: <strong>{perfil.cuota.hechas} / {perfil.cuota.total} tareas cerradas</strong>
              </span>
            </p>
          </div>
        </div>

        <div class="w-full shrink-0 space-y-3 xl:w-80">
          <div class="rounded-lg border border-tezcat-border bg-tezcat-surface p-3">
            <div class="mb-1.5 flex justify-between gap-2 font-mono text-[10px] tracking-wider uppercase">
              <span class="text-tezcat-textSecondary">Progreso hacia Nivel {perfil.nivelSiguiente}</span>
              <span class="font-bold text-tezcat-cyan">{num(perfil.xp)} / {num(perfil.xpMeta)} XP</span>
            </div>
            <div class="h-2 overflow-hidden rounded bg-tezcat-bg">
              <div class="h-full bg-tezcat-cyan shadow-glow-cyan-sm transition-all duration-700" style="width: {xpPct}%"></div>
            </div>
            <div class="mt-1 flex justify-between font-mono text-[10px] text-tezcat-textSecondary">
              <span>{xpPct}% completado</span>
              <span class="font-semibold text-tezcat-gold">+{num(xpFalta)} XP restantes</span>
            </div>
          </div>

          <button
            type="button"
            onclick={reclamar}
            class="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-5 py-2.5 text-sm font-semibold transition-colors hover:border-tezcat-cyan/40 hover:text-tezcat-cyan"
          >
            <span class="material-symbols-outlined text-tezcat-cyan transition-transform group-hover:rotate-12">bolt</span>
            Reclamar tareas opcionales (+XP)
          </button>
        </div>
      </div>
    </section>

    <!-- Indicadores -->
    <section aria-label="Indicadores" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {#each kpis as k (k.titulo)}
        {@const t = tonos[k.tono]}
        <div class="rounded-xl border bg-tezcat-card p-4 shadow-md transition-colors {t.caja}">
          <div class="flex items-center justify-between gap-2 font-mono text-[10px] tracking-wider uppercase {t.titulo}">
            <span class="font-semibold">{k.titulo}</span>
            {#if k.insignia}
              <span class="flex items-center gap-1 rounded bg-tezcat-surfaceAlt px-1.5 py-0.5 font-bold text-tezcat-gold">
                <span class="material-symbols-outlined text-[12px]">{k.icono}</span>{k.insignia}
              </span>
            {:else}
              <span class="material-symbols-outlined text-lg {t.icono}">{k.icono}</span>
            {/if}
          </div>
          <p class="my-2 flex items-baseline gap-2 {t.valor}">
            <span class="font-mono text-4xl font-bold tracking-tight">{k.valor}</span>
            {#if k.etiqueta}<span class="font-mono text-xs font-semibold uppercase">{k.etiqueta}</span>{/if}
          </p>
          <p class="flex items-center gap-1.5 border-t pt-2 font-mono text-[11px] {t.pie}">
            {#if k.pieIcono}
              <span class="material-symbols-outlined text-xs">{k.pieIcono}</span>
            {:else}
              <span class="size-1.5 rounded-full bg-current"></span>
            {/if}
            <span class="truncate">{k.pie}</span>
          </p>
        </div>
      {/each}
    </section>

    <div class="grid items-start gap-6 lg:grid-cols-12">
      <!-- Tareas prioritarias -->
      <div class="lg:col-span-7">
        <Panel titulo="Mis tareas prioritarias">
          {#snippet acciones()}
            <span class="rounded-full bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[10px] font-semibold uppercase">
              {tareas.length - hechas.size} activas
            </span>
          {/snippet}

          <ul class="space-y-2">
            {#each tareas as t (t.id)}
              {@const p = prioridades[t.prioridad]}
              <li class="relative overflow-hidden rounded-lg border border-tezcat-border bg-tezcat-bg p-4 pl-5 transition-colors hover:bg-tezcat-surface {p.hover}">
                <span class="absolute inset-y-0 left-0 w-1 {p.barra}"></span>
                <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <label class="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      class="mt-1 size-4 shrink-0 accent-tezcat-cyan"
                      checked={hechas.has(t.id)}
                      onchange={() => alternar(t.id)}
                    />
                    <span class="min-w-0 {hechas.has(t.id) ? 'line-through opacity-50' : ''}">
                      <span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-tezcat-textSecondary">
                        <span class="rounded px-1.5 py-0.5 font-bold tracking-wider uppercase {p.etiqueta}">{p.texto}</span>
                        <span>{t.id}</span>
                        <span class="flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]">schedule</span>{t.vence}
                        </span>
                      </span>
                      <span class="mt-1 block truncate font-semibold">{t.titulo}</span>
                      <span class="block truncate text-xs text-tezcat-textSecondary">{t.detalle}</span>
                    </span>
                  </label>

                  <div class="shrink-0 pl-7 sm:pl-0 sm:text-right">
                    <p class="flex gap-2 font-mono text-[11px] font-bold text-tezcat-gold sm:justify-end">
                      <span class="rounded bg-tezcat-surfaceAlt px-2 py-1">+{t.xp} XP</span>
                      <span class="flex items-center gap-1 rounded bg-tezcat-surfaceAlt px-2 py-1">
                        <span class="material-symbols-outlined text-xs">monetization_on</span>+{t.pts} PTS
                      </span>
                    </p>
                    <p class="mt-1 font-mono text-[10px] text-tezcat-textSecondary">Impacto: {t.impacto}</p>
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </Panel>
      </div>

      <!-- Tareas opcionales -->
      <div class="lg:col-span-5">
        <Panel
          titulo="Tareas opcionales y bounties"
          acento="gold"
          descripcion="Acepta misiones voluntarias para sumar puntos canjeables y subir al Nivel {perfil.nivelSiguiente}."
        >
          {#snippet acciones()}
            <span class="rounded border border-tezcat-gold/30 bg-tezcat-gold/10 px-2 py-0.5 font-mono text-[10px] font-bold text-tezcat-gold uppercase">
              Disponibles ({misiones.length})
            </span>
          {/snippet}

          <ul bind:this={listaMisiones} class="space-y-3">
            {#each misiones as m, i (m.id)}
              {@const ok = aceptadas.has(m.id)}
              <li class="space-y-3 rounded-lg bg-tezcat-bg p-4 transition-colors hover:bg-tezcat-surface">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold">{m.titulo}</h3>
                  <span class="flex shrink-0 items-center gap-1 rounded border border-tezcat-gold/40 bg-tezcat-surfaceAlt px-2.5 py-1 font-mono text-xs font-bold text-tezcat-gold">
                    <span class="material-symbols-outlined text-sm">monetization_on</span>+{m.pts} PTS
                  </span>
                </div>
                <p class="text-xs text-tezcat-textSecondary">{m.detalle}</p>
                <div class="flex items-center justify-between gap-2 border-t border-tezcat-border pt-2 font-mono text-[11px] text-tezcat-textSecondary">
                  <span class="flex items-center gap-3">
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs text-tezcat-cyan">timelapse</span>~{m.estimado}
                    </span>
                    <span class="font-bold text-tezcat-gold">+{m.xp} XP</span>
                  </span>
                  <button
                    type="button"
                    disabled={ok}
                    onclick={() => aceptar(m.id)}
                    class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold tracking-wider uppercase transition-colors {ok
                      ? 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan'
                      : 'border-tezcat-border bg-tezcat-surfaceAlt hover:border-tezcat-cyan/40 hover:text-tezcat-cyan'} {resaltar && i === 0
                      ? 'ring-2 ring-tezcat-cyan'
                      : ''}"
                  >
                    {ok ? 'Misión aceptada' : 'Aceptar misión'}
                    <span class="material-symbols-outlined text-xs">{ok ? 'done' : 'arrow_forward'}</span>
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        </Panel>
      </div>
    </div>

    <!-- Módulos según el rol (los decide el servidor) -->
    <section aria-label="Módulos" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each tarjetas as t (t.id)}
        <TarjetaMetrica
          titulo={t.titulo}
          descripcion={t.descripcion}
          icono={t.icono}
          href={t.href}
          acento={t.acento}
          valor={t.valor}
          etiqueta={t.etiqueta}
        />
      {/each}
    </section>
  </main>

  <!-- Aviso al aceptar una misión -->
  <div
    role="status"
    aria-live="polite"
    class="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-xl border border-tezcat-cyan/40 bg-tezcat-surfaceAlt p-4 shadow-2xl transition-all duration-300 {aviso
      ? ''
      : 'pointer-events-none translate-y-24 opacity-0'}"
  >
    <span class="material-symbols-outlined text-xl text-tezcat-cyan">check_circle</span>
    <p>
      <span class="block font-semibold">Misión asignada</span>
      <span class="font-mono text-[11px] text-tezcat-textSecondary">El bounty se agregó a tu lista activa.</span>
    </p>
  </div>
</div>