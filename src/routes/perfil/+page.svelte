<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import GraficaRadarRamas from '$lib/components/GraficaRadarRamas.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let guardandoFoto = $state(false);
  let guardandoPassword = $state(false);

  type Categoria = 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';
  type TabHistorial = 'CONTRIBUCIONES' | 'EXP' | 'MONEDAS';

  let tabHistorial = $state<TabHistorial>('CONTRIBUCIONES');

  const emojiPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': '🖥️',
    FRAMEWORK: '🧩'
  };

  const claseChipPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    FRAMEWORK: 'border-purple-400/40 bg-purple-400/10 text-purple-300'
  };

  const iniciales = (nombre: string) =>
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

  const fecha = (d: Date | string) =>
    new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

  const p = $derived(data.progresoNivel);
  const totalPuntosSkills = $derived(
    data.habilidades.reduce((acc, h) => acc + h.puntos, 0)
  );
  const insigniasDesbloqueadas = $derived(
    data.insignias.filter((i) => i.desbloqueada).length
  );
</script>

<svelte:head><title>Mi perfil | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-10">
    <!-- Banner principal de Perfil, Nivel, Puntos y Especialidades (TW-16 y TW-19) -->
    <section class="relative overflow-hidden rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      <div class="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-tezcat-cyan/10 blur-3xl"></div>

      <div class="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <!-- Datos del usuario -->
        <div class="flex min-w-0 items-center gap-5">
          <div class="relative shrink-0">
            <span class="flex size-20 items-center justify-center rounded-2xl bg-tezcat-surfaceAlt font-mono text-2xl font-bold text-tezcat-cyan ring-2 ring-tezcat-cyan/30">
              {#if data.user.fotoPerfil && data.user.rol !== 'ADMIN'}
                <img src={`/perfil/foto?v=${data.user.fotoPerfil}`} alt="Tu foto de perfil" class="size-20 rounded-2xl object-cover" width="80" height="80" />
              {:else}
                {iniciales(data.user.nombre)}
              {/if}
            </span>
            <span class="absolute -right-2 -bottom-2 rounded-lg border border-tezcat-cyan/50 bg-tezcat-bg px-2 py-0.5 font-mono text-[11px] font-bold text-tezcat-cyan shadow-md">
              NVL {p.nivel}
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
              <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-gold">
                Rol: {data.user.rol}
              </span>
              <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-cyan">
                {data.departamento ?? 'Sin asignar'}
              </span>
              <span class="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                {insigniasDesbloqueadas}/{data.insignias.length} insignias
              </span>
            </div>

            <h1 class="mt-2 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {data.user.nombre}
            </h1>
            <p class="mt-1 text-xs text-tezcat-textSecondary">
              Perfil gamificado de progreso, nivel de experiencia (EXP), saldo de monedas, insignias y especialidades técnicas.
            </p>
          </div>
        </div>

        <!-- Barra de Nivel: cada 1,000 EXP sube 1 nivel (TW-16 / TW-19) -->
        <div class="w-full shrink-0 rounded-xl border border-tezcat-border bg-tezcat-bg/90 p-4 lg:w-88">
          <div class="flex items-center justify-between font-mono text-xs">
            <span class="font-bold text-white uppercase">Nivel {p.nivel}</span>
            <span class="font-bold text-tezcat-cyan">
              {p.expEnNivelActual} / {p.expMetaNivel} EXP
            </span>
          </div>

          <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
            <div
              class="h-full bg-linear-to-r from-tezcat-cyan to-emerald-400 transition-all duration-500"
              style="width: {p.porcentajeNivel}%"
            ></div>
          </div>

          <div class="mt-2 flex items-center justify-between font-mono text-[10px] text-tezcat-textSecondary">
            <span>{p.porcentajeNivel}% del nivel actual</span>
            <span class="text-tezcat-gold">
              Faltan {p.expRestanteParaSubir} EXP para Nivel {p.nivelSiguiente}
            </span>
          </div>
        </div>
      </div>

      <!-- Resumen de métricas separando claramente EXP (rango) vs Monedas (saldo canjeable) -->
      <dl class="relative mt-6 grid gap-3 border-t border-tezcat-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Experiencia acumulada (No gastable)
          </dt>
          <dd class="mt-1 font-mono text-xl font-bold text-tezcat-cyan">
            {data.exp} EXP
          </dd>
          <p class="mt-0.5 text-[11px] text-tezcat-textMuted">
            Nivel {p.nivel} ({p.expEnNivelActual} EXP en este nivel)
          </p>
        </div>

        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <div class="flex items-center justify-between">
            <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
              Saldo de monedas (Canjeable)
            </dt>
            {#if data.user.rol !== 'ADMIN'}
              <a
                href="/tienda"
                class="font-mono text-[10px] font-semibold text-amber-300 hover:underline"
              >
                Ir a Tienda →
              </a>
            {/if}
          </div>
          <dd class="mt-1 font-mono text-xl font-bold text-amber-300">
            {data.monedas} monedas
          </dd>
          <p class="mt-0.5 text-[11px] text-tezcat-textMuted">
            Independiente de tu EXP y nivel
          </p>
        </div>

        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Puntos de Habilidad (Skills)
          </dt>
          <dd class="mt-1 font-mono text-xl font-bold text-emerald-300">
            +{totalPuntosSkills} pts
          </dd>
          <p class="mt-0.5 text-[11px] text-tezcat-textMuted">
            {data.especialidades.length} {data.especialidades.length === 1 ? 'especialidad activa' : 'especialidades activas'}
          </p>
        </div>

        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Contribuciones Opcionales
          </dt>
          <dd class="mt-1 font-mono text-xl font-bold text-white">
            {data.totalContribuciones} aprobadas
          </dd>
          <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted uppercase">
            Depto: {data.departamento ?? 'Sin asignar'}
          </p>
        </div>
      </dl>

      <!-- TW-19: Especialidades Técnicas Demostradas -->
      <div class="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tezcat-border/80 bg-tezcat-bg/60 px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-base text-tezcat-cyan">stars</span>
          <span class="font-mono text-[11px] font-bold tracking-wider text-white uppercase">
            Especialidades demostradas:
          </span>
        </div>

        {#if data.especialidades.length === 0}
          <span class="text-xs text-tezcat-textSecondary">
            Sin especialidades registradas aún. Completa tareas opcionales con etiquetas en el Muro para destacar tus áreas.
          </span>
        {:else}
          <div class="flex flex-wrap items-center gap-2">
            {#each data.especialidades as esp (esp.nombre)}
              <span
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold {claseChipPorCategoria[esp.categoria]}"
              >
                <span aria-hidden="true">{emojiPorCategoria[esp.categoria]}</span>
                <span>{esp.nombre}</span>
                <span class="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] text-white">
                  {esp.rango} · Nvl {esp.puntos}
                </span>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    {#if data.user.rol === 'ENCARGADO' || data.user.rol === 'MIEMBRO'}
      <Panel titulo="Ajustes de perfil" descripcion="Tu nombre, correo, rol y departamento los administra el administrador.">
        <div class="grid gap-8 md:grid-cols-2">
          <div class="min-w-0 space-y-4">
            <h3 class="font-semibold text-white">Foto de perfil</h3>
            <p id="ayuda-foto" class="text-sm text-tezcat-textSecondary">JPG, PNG o WebP sin animación, de hasta 2 MB y 16 megapíxeles. La foto se recorta a un cuadrado.</p>
            {#if form && 'ajuste' in form && form.ajuste === 'foto'}
              {#if form.error}<p role="alert" class="text-sm text-red-300">{form.error}</p>{/if}
              {#if form.ok}<p role="status" class="text-sm text-emerald-300">{form.ok}</p>{/if}
            {/if}
            <form method="POST" action="?/guardarFoto" enctype="multipart/form-data" class="space-y-4" use:enhance={() => {
              guardandoFoto = true;
              return async ({ update }) => { try { await update(); } finally { guardandoFoto = false; } };
            }}>
              <label for="foto" class="block text-sm font-medium">Seleccionar imagen</label>
              <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" required aria-describedby="ayuda-foto" class="block w-full rounded-lg border border-tezcat-border bg-tezcat-bg p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-tezcat-surfaceAlt file:px-3 file:py-2 file:text-tezcat-textPrimary focus-visible:outline-2 focus-visible:outline-tezcat-cyan" />
              <button disabled={guardandoFoto} class="rounded-lg bg-tezcat-cyan px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tezcat-cyan disabled:opacity-50">{guardandoFoto ? 'Guardando…' : 'Guardar foto'}</button>
            </form>
            {#if data.user.fotoPerfil}
              <form method="POST" action="?/quitarFoto" use:enhance={() => {
                guardandoFoto = true;
                return async ({ update }) => { try { await update(); } finally { guardandoFoto = false; } };
              }}>
                <button disabled={guardandoFoto} class="rounded-lg border border-tezcat-border px-4 py-2.5 text-sm hover:bg-tezcat-surfaceAlt focus-visible:outline-2 focus-visible:outline-tezcat-cyan disabled:opacity-50">Quitar foto</button>
              </form>
            {/if}
          </div>
          <form method="POST" action="?/cambiarPassword" class="min-w-0 space-y-4" use:enhance={() => {
            guardandoPassword = true;
            return async ({ update }) => { try { await update(); } finally { guardandoPassword = false; } };
          }}>
            <h3 class="font-semibold text-white">Cambiar contraseña</h3>
            <p id="ayuda-password" class="text-sm text-tezcat-textSecondary">Usa entre 12 y 128 caracteres. Al cambiarla, se cerrarán todas tus sesiones y tendrás que iniciar sesión de nuevo.</p>
            {#if form && 'ajuste' in form && form.ajuste === 'password' && form.error}
              <p role="alert" class="text-sm text-red-300">{form.error}</p>
            {/if}
            {#each [{ id: 'actual', label: 'Contraseña actual', autocomplete: 'current-password' }, { id: 'nueva', label: 'Nueva contraseña', autocomplete: 'new-password' }, { id: 'confirmacion', label: 'Confirmar nueva contraseña', autocomplete: 'new-password' }] as campo}
              <div class="space-y-1.5">
                <label for={campo.id} class="block text-sm font-medium">{campo.label}</label>
                <input id={campo.id} name={campo.id} type="password" autocomplete={campo.id === 'actual' ? 'current-password' : 'new-password'} required minlength={campo.id === 'actual' ? undefined : 12} maxlength={campo.id === 'actual' ? 1024 : 128} aria-describedby="ayuda-password" class="w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm focus:border-tezcat-cyan focus:outline-none focus:ring-1 focus:ring-tezcat-cyan" />
              </div>
            {/each}
            <button disabled={guardandoPassword} class="rounded-lg bg-tezcat-cyan px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tezcat-cyan disabled:opacity-50">{guardandoPassword ? 'Cambiando…' : 'Cambiar contraseña'}</button>
          </form>
        </div>
      </Panel>
    {/if}

    <!-- TW-20 y TW-18: Gráfica Radar Interactiva y Valores Numéricos de Ramas de Habilidad -->
    <Panel
      titulo="Gráfica radar de ramas de habilidad"
      descripcion="Visualización poligonal e inventario numérico de la experiencia técnica acumulada en trabajo opcional aprobado."
    >
      {#snippet acciones()}
        <a
          href="/muro"
          class="inline-flex items-center gap-1.5 rounded-xl border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
        >
          <span class="material-symbols-outlined text-sm">storefront</span>
          Muro de Oportunidades
        </a>
      {/snippet}

      <GraficaRadarRamas habilidades={data.habilidades} />
    </Panel>

    <div class="grid gap-6 lg:grid-cols-12">
      <!-- TW-19: Insignias y Logros Desbloqueables (5 columnas) -->
      <div class="lg:col-span-5">
        <Panel
          titulo="Insignias y logros"
          descripcion="Reconocimientos otorgados automáticamente a partir de tus movimientos registrados."
          acento="gold"
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {#each data.insignias as ins (ins.id)}
              {@const pct = Math.min(100, Math.round((ins.actual / ins.meta) * 100))}
              <div
                class="flex items-start gap-3.5 rounded-xl border p-3.5 transition-all
                  {ins.desbloqueada
                    ? 'border-amber-400/40 bg-amber-400/5 shadow-sm'
                    : 'border-tezcat-border bg-tezcat-bg/60 opacity-75'}"
              >
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl border
                    {ins.desbloqueada
                      ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                      : 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textMuted'}"
                >
                  <span class="material-symbols-outlined text-xl">{ins.icono}</span>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="truncate text-xs font-bold text-white">{ins.titulo}</h3>
                    {#if ins.desbloqueada}
                      <span class="shrink-0 rounded border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300 uppercase">
                        Desbloqueada
                      </span>
                    {:else}
                      <span class="shrink-0 font-mono text-[10px] text-tezcat-textMuted">
                        {ins.actual} / {ins.meta}
                      </span>
                    {/if}
                  </div>

                  <p class="mt-0.5 text-[11px] leading-relaxed text-tezcat-textSecondary">
                    {ins.descripcion}
                  </p>

                  <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
                    <div
                      class="h-full transition-all duration-300 {ins.desbloqueada ? 'bg-amber-400' : 'bg-tezcat-cyan'}"
                      style="width: {pct}%"
                    ></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </Panel>
      </div>

      <!-- TW-16, TW-17 y TW-19: Historial de Contribuciones Opcionales y Movimientos Registrados (7 columnas) -->
      <div class="lg:col-span-7">
        <Panel
          titulo="Historial de contribuciones y movimientos"
          descripcion="Registro verificable de actividades opcionales aprobadas, experiencia (EXP) y movimientos de monedas."
        >
          <!-- Pestañas de navegación del historial -->
          <div class="mb-4 flex flex-wrap gap-1.5 border-b border-tezcat-border/70 pb-3">
            <button
              type="button"
              onclick={() => (tabHistorial = 'CONTRIBUCIONES')}
              class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
                {tabHistorial === 'CONTRIBUCIONES'
                  ? 'border-tezcat-cyan/60 bg-tezcat-cyan/15 text-tezcat-cyan'
                  : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
            >
              Contribuciones Opcionales ({data.totalContribuciones})
            </button>
            <button
              type="button"
              onclick={() => (tabHistorial = 'EXP')}
              class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
                {tabHistorial === 'EXP'
                  ? 'border-tezcat-cyan/60 bg-tezcat-cyan/15 text-tezcat-cyan'
                  : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
            >
              Movimientos de EXP ({data.historialXp.length})
            </button>
            <button
              type="button"
              onclick={() => (tabHistorial = 'MONEDAS')}
              class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
                {tabHistorial === 'MONEDAS'
                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                  : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
            >
              Movimientos de Monedas ({data.historialPuntos.length})
            </button>
          </div>

          {#if tabHistorial === 'CONTRIBUCIONES'}
            {#if data.contribucionesOpcionales.length === 0}
              <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center">
                <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">task_alt</span>
                <p class="mt-2 text-xs font-semibold text-tezcat-textSecondary">
                  {data.totalContribuciones ? 'El detalle de las tareas aprobadas ya no está disponible' : 'Aún no tienes contribuciones opcionales aprobadas'}
                </p>
                <p class="mt-1 text-[11px] text-tezcat-textMuted">
                  Cuando tomes una tarea del Muro de Oportunidades y el encargado la apruebe, aparecerá aquí con sus etiquetas y recompensas.
                </p>
              </div>
            {:else}
              <ul class="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {#each data.contribucionesOpcionales as t (t.id)}
                  <li class="rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 text-xs transition-colors hover:border-tezcat-cyan/40">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <a
                          href="/tareas/{t.id}"
                          class="font-semibold text-white transition-colors hover:text-tezcat-cyan"
                        >
                          #{t.numero} · {t.titulo}
                        </a>
                        <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                          {t.proyectoNombre ?? 'Tarea departamental'} · Aprobada el {fecha(t.fechaAprobacion)}
                        </p>
                      </div>

                      <div class="flex items-center gap-1.5 shrink-0">
                        {#if (t.xpOfrecido ?? 0) > 0}
                          <span class="rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-2 py-0.5 font-mono text-[11px] font-bold text-tezcat-cyan">
                            +{t.xpOfrecido} EXP
                          </span>
                        {/if}
                        {#if (t.puntosOfrecidos ?? 0) > 0}
                          <span class="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                            +{t.puntosOfrecidos} monedas
                          </span>
                        {/if}
                      </div>
                    </div>

                    {#if t.etiquetas.length > 0}
                      <div class="mt-2.5 flex flex-wrap gap-1.5">
                        {#each t.etiquetas as et (et.nombre)}
                          <span
                            class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] {claseChipPorCategoria[et.categoria]}"
                          >
                            <span aria-hidden="true">{emojiPorCategoria[et.categoria]}</span>
                            {et.nombre} (+1 pt)
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          {:else if tabHistorial === 'EXP'}
            {#if data.historialXp.length === 0}
              <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center">
                <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">bolt</span>
                <p class="mt-2 text-xs font-semibold text-tezcat-textSecondary">
                  Sin movimientos de experiencia todavía
                </p>
                <p class="mt-1 text-[11px] text-tezcat-textMuted">
                  Al aprobarse una tarea opcional que hayas tomado del Muro, verás aquí tu ganancia de EXP.
                </p>
              </div>
            {:else}
              <ul class="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {#each data.historialXp as mov (mov.id)}
                  <li class="flex items-center justify-between gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 text-xs">
                    <div class="min-w-0">
                      {#if mov.tareaId}
                        <a
                          href="/tareas/{mov.tareaId}"
                          class="truncate font-semibold text-white transition-colors hover:text-tezcat-cyan"
                        >
                          {mov.motivo}
                        </a>
                      {:else}
                        <p class="truncate font-semibold text-white">{mov.motivo}</p>
                      {/if}
                      <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                        {fecha(mov.creadoEn)}
                      </p>
                    </div>

                    <span class="shrink-0 rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-2.5 py-1 font-mono text-xs font-bold text-tezcat-cyan">
                      +{mov.cantidad} EXP
                    </span>
                  </li>
                {/each}
              </ul>
            {/if}
          {:else}
            {#if data.historialPuntos.length === 0}
              <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center">
                <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">monetization_on</span>
                <p class="mt-2 text-xs font-semibold text-tezcat-textSecondary">
                  Sin movimientos de monedas registrados
                </p>
                <p class="mt-1 text-[11px] text-tezcat-textMuted">
                  Aquí se registran los abonos por tareas opcionales aprobadas y los cargos por canjes en la tienda.
                </p>
              </div>
            {:else}
              <ul class="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {#each data.historialPuntos as mov (mov.id)}
                  {@const esAbono = mov.cantidad >= 0}
                  <li class="flex items-center justify-between gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 text-xs">
                    <div class="min-w-0">
                      {#if mov.tareaId}
                        <a
                          href="/tareas/{mov.tareaId}"
                          class="truncate font-semibold text-white transition-colors hover:text-tezcat-cyan"
                        >
                          {mov.motivo}
                        </a>
                      {:else}
                        <p class="truncate font-semibold text-white">{mov.motivo}</p>
                      {/if}
                      <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                        {fecha(mov.creadoEn)}
                      </p>
                    </div>

                    <span
                      class="shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold
                        {esAbono
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                          : 'border-amber-400/40 bg-amber-400/10 text-amber-300'}"
                    >
                      {esAbono ? `+${mov.cantidad}` : mov.cantidad} monedas
                    </span>
                  </li>
                {/each}
              </ul>
            {/if}
          {/if}
        </Panel>
      </div>
    </div>
  </main>
</div>
