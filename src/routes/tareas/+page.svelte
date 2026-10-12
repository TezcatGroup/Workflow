<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data }: { data: PageData } = $props();

  // Contrato de datos: ver +page.server.ts (propiedad del backend).
  // data.tareas ya viene ordenada por fecha límite (la más próxima primero).

  const textoEstado: Record<string, string> = {
    ASIGNADA: 'Asignada', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', TERMINADA: 'Terminada'
  };

  const claseEstado: Record<string, string> = {
    ASIGNADA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    EN_PROCESO: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    EN_REVISION: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
    TERMINADA: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
  };

  const iconoEstado: Record<string, string> = {
    ASIGNADA: 'assignment_ind', EN_PROCESO: 'progress_activity', EN_REVISION: 'rate_review', TERMINADA: 'task_alt'
  };

  const clasePrioridad: Record<string, string> = {
    BAJA: 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary',
    MEDIA: 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    ALTA: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    URGENTE: 'border-red-400/40 bg-red-400/10 text-red-300'
  };

  const fecha = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : 'Sin fecha';

  // Días restantes para la fecha límite (negativo = vencida).
  function diasRestantes(d: Date): number {
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  }

  function textoVencimiento(t: (typeof data.tareas)[number]): { texto: string; urgente: boolean } {
    if (t.estado === 'TERMINADA') return { texto: 'Completada', urgente: false };
    const dias = diasRestantes(t.fechaLimite);
    if (dias < 0) return { texto: `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`, urgente: true };
    if (dias === 0) return { texto: 'Vence hoy', urgente: true };
    if (dias === 1) return { texto: 'Vence mañana', urgente: false };
    return { texto: `Vence en ${dias} días`, urgente: false };
  }

  // Métricas derivadas del propio listado (no requieren cambios en el backend).
  const porEstado = $derived({
    asignadas: data.tareas.filter((t) => t.estado === 'ASIGNADA').length,
    enProceso: data.tareas.filter((t) => t.estado === 'EN_PROCESO').length,
    enRevision: data.tareas.filter((t) => t.estado === 'EN_REVISION').length,
    terminadas: data.tareas.filter((t) => t.estado === 'TERMINADA').length,
    vencidas: data.tareas.filter((t) => t.estado !== 'TERMINADA' && diasRestantes(t.fechaLimite) < 0).length
  });
</script>

<svelte:head><title>Tareas | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-5xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
          Sprint 4 · Núcleo de tareas obligatorias
        </p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Tareas</h1>
        <p class="mt-1.5 text-xs text-tezcat-textSecondary">
          {#if data.user.rol === 'MIEMBRO'}
            Tareas asignadas a ti, ordenadas por fecha límite.
          {:else if data.user.rol === 'ENCARGADO'}
            Tareas de tu departamento, ordenadas por fecha límite.
          {:else}
            Todas las tareas del sistema (solo lectura).
          {/if}
        </p>
      </div>

      {#if data.puedeCrear}
        <a
          href="/tareas/nueva"
          class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-4 py-2.5 text-sm font-bold tracking-wide text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-lg">add_task</span>
          Nueva tarea
        </a>
      {/if}
    </div>

    <!-- Métricas rápidas -->
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">Asignadas</p>
        <p class="mt-1 text-2xl font-bold text-tezcat-cyan">{porEstado.asignadas}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">En proceso</p>
        <p class="mt-1 text-2xl font-bold text-amber-300">{porEstado.enProceso}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">En revisión</p>
        <p class="mt-1 text-2xl font-bold text-violet-300">{porEstado.enRevision}</p>
      </div>
      <div class="rounded-xl border border-tezcat-border bg-tezcat-card/90 p-4">
        <p class="font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">Terminadas</p>
        <p class="mt-1 text-2xl font-bold text-emerald-300">{porEstado.terminadas}</p>
      </div>
    </div>

    {#if porEstado.vencidas > 0}
      <div
        role="alert"
        class="mb-6 flex items-center gap-2.5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300"
      >
        <span class="material-symbols-outlined shrink-0 text-base">warning</span>
        <span>Hay {porEstado.vencidas} tarea{porEstado.vencidas === 1 ? '' : 's'} con fecha límite vencida.</span>
      </div>
    {/if}

    <!-- Listado -->
    {#if data.tareas.length === 0}
      <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/50 px-6 py-14 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">inbox</span>
        <p class="text-sm font-semibold">No hay tareas para mostrar</p>
        <p class="max-w-sm text-xs text-tezcat-textSecondary">
          {#if data.puedeCrear}
            Crea la primera tarea obligatoria para tu departamento.
          {:else}
            Cuando te asignen una tarea, aparecerá aquí.
          {/if}
        </p>
        {#if data.puedeCrear}
          <a
            href="/tareas/nueva"
            class="mt-2 inline-flex items-center gap-2 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2 text-sm font-semibold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
          >
            <span class="material-symbols-outlined text-lg">add_task</span>
            Crear tarea
          </a>
        {/if}
      </div>
    {:else}
      <ul class="space-y-3">
        {#each data.tareas as t (t.id)}
          {@const vencimiento = textoVencimiento(t)}
          <li>
            <a
              href="/tareas/{t.id}"
              class="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-md backdrop-blur-md transition-all hover:border-tezcat-cyan/50 hover:shadow-glow-cyan/20"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-cyan uppercase">
                    CORE-{t.numero ?? '?'}
                  </span>
                  <span class="rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase {clasePrioridad[t.prioridad ?? ''] ?? 'border-tezcat-border bg-tezcat-surfaceAlt text-tezcat-textSecondary'}">
                    {t.prioridad ?? '—'}
                  </span>
                  {#if t.estado !== 'TERMINADA' && vencimiento.urgente}
                    <span class="inline-flex items-center gap-1 font-mono text-[10px] font-semibold tracking-wider text-red-300 uppercase">
                      <span class="material-symbols-outlined text-xs">warning</span>
                      {vencimiento.texto}
                    </span>
                  {/if}
                </div>
                <p class="mt-1.5 truncate font-semibold text-white group-hover:text-tezcat-cyan">{t.titulo}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tezcat-textSecondary">
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">person</span>
                    {t.responsableNombre ?? 'Sin asignar'}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">event</span>
                    {fecha(t.fechaLimite)} · {vencimiento.texto}
                  </span>
                </p>
              </div>

              <span class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase {claseEstado[t.estado] ?? ''}">
                <span class="material-symbols-outlined text-sm">{iconoEstado[t.estado] ?? 'label'}</span>
                {textoEstado[t.estado] ?? t.estado}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
</div>