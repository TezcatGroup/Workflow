<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data }: { data: PageData } = $props();

  // ───────────────────────────────────────────────────────────────────────────
  // DATOS DE EJEMPLO (maquetación TW-13).
  // TODO (contrato Sprint 7): reemplazar por los datos reales que cargue el
  // +page.server.ts cuando el backend publique el endpoint del Muro. La forma
  // de las tarjetas ya sigue lo propuesto en el contrato: etiquetas con
  // categoría, encargado publicador y fecha límite.
  // ───────────────────────────────────────────────────────────────────────────
  type Categoria = 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';
  type Etiqueta = { nombre: string; categoria: Categoria };
  type Oportunidad = {
    id: string;
    titulo: string;
    descripcion: string;
    encargado: string;
    fechaLimite: string;
    etiquetas: Etiqueta[];
  };

  // La "imagen" de cada etiqueta es un emoji por categoría (decisión del equipo).
  const emojiPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': '🖥️',
    FRAMEWORK: '🧩'
  };
  const claseChipPorCategoria: Record<Categoria, string> = {
    'LENGUAJE DE PROGRAMACIÓN': 'border-tezcat-cyan/40 bg-tezcat-cyan/10 text-tezcat-cyan',
    FRAMEWORK: 'border-purple-400/40 bg-purple-400/10 text-purple-300'
  };

  // Fechas relativas para que la maquetación nunca se vea vencida con el tiempo.
  const enDias = (dias: number) =>
    new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

  const oportunidades: Oportunidad[] = [
    {
      id: 'ej-01',
      titulo: 'Documentar endpoints del laboratorio',
      descripcion:
        'Redactar y publicar la referencia de los endpoints internos del sistema, con ejemplos de petición y respuesta para cada uno.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(12),
      etiquetas: [
        { nombre: 'TypeScript', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'Svelte', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-02',
      titulo: 'Script de respaldo de la base de datos',
      descripcion:
        'Crear un script que genere respaldos automáticos semanales de PostgreSQL y conserve el historial del último mes.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(2),
      etiquetas: [
        { nombre: 'SQL', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' }
      ]
    },
    {
      id: 'ej-03',
      titulo: 'Rediseñar la pantalla de perfil',
      descripcion:
        'Modernizar la vista de perfil con la paleta Tezcat, incluyendo estados vacíos y la versión para móvil.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(5),
      etiquetas: [
        { nombre: 'Svelte', categoria: 'FRAMEWORK' },
        { nombre: 'Tailwind CSS', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-04',
      titulo: 'Chatbot de dudas frecuentes',
      descripcion:
        'Prototipo conversacional que responda las preguntas más comunes del laboratorio a partir de un banco de respuestas curated.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(20),
      etiquetas: [{ nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' }]
    },
    {
      id: 'ej-05',
      titulo: 'Panel de métricas de uso de equipos',
      descripcion:
        'Pequeño tablero con gráficas de uso de las máquinas del laboratorio por semana, para detectar las horas valle.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(-1),
      etiquetas: [
        { nombre: 'TypeScript', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'React', categoria: 'FRAMEWORK' }
      ]
    },
    {
      id: 'ej-06',
      titulo: 'Automatizar registro de entradas',
      descripcion:
        'Sustituir el registro en papel con un lector de códigos que alimente la bitácora digital del laboratorio.',
      encargado: 'Luis Lopez',
      fechaLimite: enDias(8),
      etiquetas: [
        { nombre: 'Python', categoria: 'LENGUAJE DE PROGRAMACIÓN' },
        { nombre: 'SQL', categoria: 'LENGUAJE DE PROGRAMACIÓN' }
      ]
    }
  ];

  function diasRestantes(fecha: string): number {
    return Math.ceil((new Date(`${fecha}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  }

  function claseFecha(fecha: string): string {
    const dias = diasRestantes(fecha);
    if (dias < 0) return 'text-red-300'; // vencida
    if (dias <= 3) return 'text-amber-300'; // por vencer
    return 'text-tezcat-textSecondary';
  }

  function formatearFecha(fecha: string): string {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  }
</script>

<svelte:head>
  <title>Muro de oportunidades | Tezcat Workflow</title>
</svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    <!-- Encabezado -->
    <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
          TW-13 · Trabajo voluntario
        </p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Muro de oportunidades</h1>
        <p class="mt-1.5 max-w-2xl text-xs text-tezcat-textSecondary">
          Tareas opcionales publicadas por los encargados: nadie está asignado a ellas. Toma
          voluntariamente la que mejor combine con tus intereses y habilidades.
        </p>
      </div>

      {#if data.user.rol === 'ENCARGADO'}
        <a
          href="/tareas/nueva"
          class="inline-flex items-center gap-1.5 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2.5 text-xs font-bold text-tezcat-cyan transition-colors hover:bg-tezcat-cyan/20"
        >
          <span class="material-symbols-outlined text-base">add</span>
          Publicar oportunidad
        </a>
      {/if}
    </div>

    <!-- Grid de oportunidades -->
    {#if oportunidades.length > 0}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each oportunidades as op (op.id)}
          <article
            class="flex flex-col rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-2xl backdrop-blur-md transition-colors hover:border-tezcat-cyan/40"
          >
            <!-- Etiquetas (TW-14): emoji y color por categoría -->
            <div class="flex flex-wrap gap-1.5">
              {#each op.etiquetas as et (et.nombre)}
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold {claseChipPorCategoria[et.categoria]}"
                >
                  <span aria-hidden="true">{emojiPorCategoria[et.categoria]}</span>
                  {et.nombre}
                </span>
              {/each}
            </div>

            <!-- Contenido -->
            <h2 class="mt-3 text-base font-bold text-tezcat-textPrimary">{op.titulo}</h2>
            <p class="mt-1.5 text-xs leading-relaxed text-tezcat-textSecondary line-clamp-3">
              {op.descripcion}
            </p>

            <!-- Meta -->
            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <span class="inline-flex items-center gap-1 text-tezcat-textSecondary">
                <span class="material-symbols-outlined text-sm text-tezcat-textMuted">person</span>
                {op.encargado}
              </span>
              <span class="inline-flex items-center gap-1 {claseFecha(op.fechaLimite)}">
                <span class="material-symbols-outlined text-sm">event</span>
                {formatearFecha(op.fechaLimite)}
              </span>
            </div>

            <!-- Acciones por rol -->
                        <!-- Acciones: solo los MIEMBROS toman tareas opcionales (TW-13).
                 El ENCARGADO no las ejecuta: solo publica (TW-13) y convierte (TW-15).
                 El ADMIN no participa del Muro. -->
            {#if data.user.rol === 'MIEMBRO' || data.user.rol === 'ENCARGADO'}
              <div class="mt-4 border-t border-tezcat-border/70 pt-4">
                {#if data.user.rol === 'MIEMBRO'}
                  <!-- TODO: conectar con el endpoint "tomar tarea" del contrato (TW-13) -->
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-xs font-bold tracking-wide text-slate-950 transition-all hover:from-emerald-300 hover:to-teal-300 active:scale-[0.99]"
                  >
                    <span class="material-symbols-outlined text-base">volunteer_activism</span>
                    Tomar tarea
                  </button>
                {:else}
                  <!-- TODO: conectar con el endpoint de conversión y asignación aleatoria (TW-15) -->
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-xs font-bold tracking-wide text-amber-300 transition-colors hover:bg-amber-400/20"
                  >
                    <span class="material-symbols-outlined text-base">upgrade</span>
                    Convertir en obligatoria
                  </button>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <!-- Estado vacío -->
      <div class="rounded-2xl border border-dashed border-tezcat-border p-12 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">storefront</span>
        <p class="mt-3 text-sm font-bold text-tezcat-textPrimary">Aún no hay oportunidades publicadas</p>
        <p class="mx-auto mt-1 max-w-sm text-xs text-tezcat-textSecondary">
          Cuando un encargado publique una tarea opcional aparecerá aquí, lista para que cualquier
          miembro la tome voluntariamente.
        </p>
      </div>
    {/if}
  </main>
</div>