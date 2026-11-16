<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const destino = $derived(data.user ? (data.user.rol === 'ADMIN' ? '/admin' : '/dashboard') : '/login');
</script>

<svelte:head>
  <title>Tezcat Workflow · Convierte el trabajo en avance</title>
  <meta name="description" content="Tezcat Workflow organiza tareas, equipos y reconocimiento en un solo lugar." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<main class="min-h-screen overflow-hidden bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <nav class="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
    <a href="/" class="flex items-center gap-3 font-bold tracking-wide uppercase">
      <span class="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-tezcat-cyan to-tezcat-tealDeep text-slate-950 shadow-glow-cyan">✦</span>
      <span>Tezcat <span class="text-tezcat-cyan">Workflow</span></span>
    </a>
    <a href={destino} class="rounded-lg border border-tezcat-border px-4 py-2 text-sm font-semibold text-tezcat-textSecondary transition hover:border-tezcat-cyan hover:text-tezcat-cyan">{data.user ? 'Ir a mi espacio' : 'Iniciar sesión'}</a>
  </nav>

  <section class="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
    <div class="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-tezcat-cyan/10 blur-3xl"></div>
    <div class="relative">
      <p class="mb-5 flex items-center gap-2 font-mono text-xs tracking-[.25em] text-tezcat-cyan uppercase"><span class="size-2 rounded-full bg-tezcat-cyan motion-safe:animate-pulse"></span> Plataforma de ejecución</p>
      <h1 class="max-w-3xl text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">El trabajo claro. <span class="text-tezcat-cyan">El equipo alineado.</span></h1>
      <p class="mt-6 max-w-xl text-lg leading-8 text-tezcat-textSecondary">Tezcat Workflow convierte objetivos en tareas visibles, colaboración medible y reconocimiento que impulsa a tu organización.</p>
      <div class="mt-9 flex flex-wrap gap-3"><a href={destino} class="rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-6 py-3.5 font-bold text-slate-950 shadow-glow-cyan transition hover:opacity-90">Explorar la plataforma <span aria-hidden="true">→</span></a><a href="#capacidades" class="rounded-xl border border-tezcat-border bg-tezcat-card px-6 py-3.5 font-semibold text-tezcat-textSecondary transition hover:border-tezcat-borderHighlight hover:text-white">Conocer más</a></div>
    </div>
    <div class="relative rounded-3xl border border-tezcat-border bg-tezcat-card/80 p-4 shadow-2xl backdrop-blur sm:p-6"><div class="rounded-2xl border border-tezcat-border bg-tezcat-bg p-5 sm:p-7"><div class="flex items-center justify-between border-b border-tezcat-border pb-5"><div><p class="font-mono text-[10px] tracking-widest text-tezcat-textMuted uppercase">Vista de equipo</p><p class="mt-1 text-xl font-bold">Ritmo de avance</p></div><span class="rounded-full bg-tezcat-cyan/10 px-3 py-1 font-mono text-xs text-tezcat-cyan">EN VIVO</span></div><div class="mt-7 grid grid-cols-3 gap-3"><div class="rounded-xl bg-tezcat-surface p-3"><p class="font-mono text-[10px] text-tezcat-textMuted uppercase">Tareas</p><p class="mt-2 text-2xl font-bold">128</p></div><div class="rounded-xl bg-tezcat-surface p-3"><p class="font-mono text-[10px] text-tezcat-textMuted uppercase">Completadas</p><p class="mt-2 text-2xl font-bold text-tezcat-cyan">84</p></div><div class="rounded-xl bg-tezcat-surface p-3"><p class="font-mono text-[10px] text-tezcat-textMuted uppercase">Equipo</p><p class="mt-2 text-2xl font-bold text-tezcat-gold">24</p></div></div><div class="mt-7 space-y-4"><div class="flex items-center justify-between text-sm"><span class="text-tezcat-textSecondary">Progreso semanal</span><span class="font-mono text-tezcat-cyan">78%</span></div><div class="h-3 rounded-full bg-tezcat-surfaceAlt"><div class="h-full w-[78%] rounded-full bg-linear-to-r from-tezcat-cyan to-teal-400"></div></div><div class="flex items-center gap-3 rounded-xl border border-tezcat-border bg-tezcat-surface p-3"><span class="flex size-9 items-center justify-center rounded-lg bg-tezcat-gold/10 text-tezcat-gold">✓</span><div><p class="text-sm font-semibold">Entrega verificada</p><p class="font-mono text-[10px] text-tezcat-textMuted">El equipo mantiene el ritmo</p></div></div></div></div></div>
  </section>

  <section id="capacidades" class="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div class="max-w-2xl"><p class="font-mono text-xs tracking-[.25em] text-tezcat-gold uppercase">Una operación, una señal</p><h2 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Todo lo que necesitas para avanzar sin perder contexto.</h2></div><div class="mt-10 grid gap-4 md:grid-cols-3"><article class="rounded-2xl border border-tezcat-border bg-tezcat-card p-6"><span class="text-2xl text-tezcat-cyan">◈</span><h3 class="mt-5 text-lg font-bold">Tareas con dirección</h3><p class="mt-2 text-sm leading-6 text-tezcat-textSecondary">Prioridades, responsables, fechas y criterios claros para que cada entrega sepa hacia dónde va.</p></article><article class="rounded-2xl border border-tezcat-border bg-tezcat-card p-6"><span class="text-2xl text-tezcat-gold">◎</span><h3 class="mt-5 text-lg font-bold">Equipos conectados</h3><p class="mt-2 text-sm leading-6 text-tezcat-textSecondary">Muro, comentarios, revisiones y notificaciones en el mismo flujo de trabajo.</p></article><article class="rounded-2xl border border-tezcat-border bg-tezcat-card p-6"><span class="text-2xl text-tezcat-cyan">✧</span><h3 class="mt-5 text-lg font-bold">Progreso que se reconoce</h3><p class="mt-2 text-sm leading-6 text-tezcat-textSecondary">Gamificación, puntos e insignias para convertir el avance cotidiano en impulso colectivo.</p></article></div></section>
  <footer class="border-t border-tezcat-border px-5 py-8 text-center font-mono text-xs text-tezcat-textMuted">© Tezcat Group · Workflow para equipos que construyen.</footer>
</main>
