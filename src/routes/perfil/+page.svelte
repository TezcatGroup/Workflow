<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data }: { data: PageData } = $props();

  type Categoria = 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';

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
</script>

<svelte:head><title>Mi perfil | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
    <!-- Banner principal de Perfil y Nivel (TW-16) -->
    <section class="relative overflow-hidden rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      <div class="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-tezcat-cyan/10 blur-3xl"></div>

      <div class="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <!-- Datos del usuario -->
        <div class="flex min-w-0 items-center gap-5">
          <div class="relative shrink-0">
            <span class="flex size-20 items-center justify-center rounded-2xl bg-tezcat-surfaceAlt font-mono text-2xl font-bold text-tezcat-cyan ring-2 ring-tezcat-cyan/30">
              {iniciales(data.user.nombre)}
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
            </div>

            <h1 class="mt-2 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {data.user.nombre}
            </h1>
            <p class="mt-1 text-xs text-tezcat-textSecondary">
              Progreso de participación en trabajo opcional, nivel de experiencia y ramas de habilidad.
            </p>
          </div>
        </div>

        <!-- Barra de Nivel: cada 1,000 EXP sube 1 nivel (TW-16) -->
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

      <!-- Resumen de métricas y datos de perfil -->
      <dl class="relative mt-6 grid gap-3 border-t border-tezcat-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Experiencia acumulada
          </dt>
          <dd class="mt-1 font-mono text-xl font-bold text-tezcat-cyan">
            {data.exp} EXP
          </dd>
          <p class="mt-0.5 text-[11px] text-tezcat-textMuted">
            Nivel {p.nivel} ({p.expEnNivelActual} EXP en este nivel)
          </p>
        </div>

        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Saldo de monedas
          </dt>
          <dd class="mt-1 font-mono text-xl font-bold text-amber-300">
            {data.monedas} monedas
          </dd>
          <p class="mt-0.5 text-[11px] text-tezcat-textMuted">
            Obtenidas por tareas opcionales
          </p>
        </div>

        <div class="rounded-xl border border-tezcat-border bg-tezcat-bg/70 p-4">
          <dt class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
            Departamento
          </dt>
          <dd class="mt-1 truncate text-base font-bold text-white">
            {data.departamento ?? 'Sin asignar'}
          </dd>
          <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted uppercase">
            Rol: {data.user.rol}
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
            +1 nivel por etiqueta completada
          </p>
        </div>
      </dl>
    </section>

    <div class="grid gap-6 lg:grid-cols-12">
      <!-- TW-18: Ramas de Habilidad / Skills por Etiqueta -->
      <div class="lg:col-span-7">
        <Panel
          titulo="Ramas de habilidad (Skills)"
          descripcion="Cada tarea opcional aprobada aumenta +1 nivel en las etiquetas técnicas marcadas en la actividad."
        >
          {#if data.habilidades.length === 0}
            <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 px-6 py-10 text-center">
              <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">military_tech</span>
              <p class="mt-2 text-sm font-semibold text-tezcat-textPrimary">
                Aún no hay ramas de habilidad registradas
              </p>
              <p class="mt-1 max-w-sm text-xs text-tezcat-textSecondary">
                Completa oportunidades del Muro con etiquetas asignadas para subir el nivel de tus skills técnicas.
              </p>
              <a
                href="/muro"
                class="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2 text-xs font-bold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
              >
                <span class="material-symbols-outlined text-sm">storefront</span>
                Ir al Muro de oportunidades
              </a>
            </div>
          {:else}
            <div class="grid gap-3 sm:grid-cols-2">
              {#each data.habilidades as skill (skill.nombre)}
                <div class="flex flex-col justify-between rounded-xl border border-tezcat-border bg-tezcat-bg p-4 transition-colors hover:border-tezcat-cyan/40">
                  <div class="flex items-start justify-between gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold {claseChipPorCategoria[skill.categoria]}"
                    >
                      <span aria-hidden="true">{emojiPorCategoria[skill.categoria]}</span>
                      {skill.nombre}
                    </span>

                    <span class="rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-2.5 py-1 font-mono text-xs font-bold text-white">
                      Nivel {skill.puntos}
                    </span>
                  </div>

                  <div class="mt-3">
                    <div class="mb-1 flex justify-between font-mono text-[10px] text-tezcat-textSecondary">
                      <span>{skill.categoria}</span>
                      <span class="text-tezcat-cyan">
                        {skill.puntos} {skill.puntos === 1 ? 'tarea aprobada' : 'tareas aprobadas'}
                      </span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
                      <div
                        class="h-full transition-all duration-300 {skill.categoria === 'LENGUAJE DE PROGRAMACIÓN' ? 'bg-tezcat-cyan' : 'bg-purple-400'}"
                        style="width: {Math.min(100, skill.puntos * 20)}%"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Panel>
      </div>

      <!-- TW-16: Historial de EXP acumulada -->
      <div class="lg:col-span-5">
        <Panel
          titulo="Historial de experiencia (TW-16)"
          descripcion="Registro de EXP acreditada al aprobarse tus tareas opcionales."
        >
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
            <ul class="space-y-2.5">
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
        </Panel>
      </div>
    </div>
  </main>
</div>