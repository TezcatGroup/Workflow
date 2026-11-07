<script lang="ts">
  export type HabilidadRadar = {
    nombre: string;
    categoria: 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';
    puntos: number;
  };

  let {
    habilidades = []
  }: {
    habilidades: HabilidadRadar[];
  } = $props();

  type FiltroCategoria = 'TODAS' | 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK';

  let filtro = $state<FiltroCategoria>('TODAS');
  let indiceActivo = $state<number | null>(null);

  const habilidadesFiltradas = $derived(
    filtro === 'TODAS' ? habilidades : habilidades.filter((h) => h.categoria === filtro)
  );

  // Para mantener la legibilidad en móvil y escritorio, el polígono muestra hasta las 8 ramas principales
  // del filtro activo, mientras que la tabla numérica adyacente muestra la totalidad de las ramas.
  const MAX_EJES_RADAR = 8;

  const ejesBase = $derived(habilidadesFiltradas.slice(0, MAX_EJES_RADAR));

  // Un polígono radar requiere al menos 3 vértices; si hay 1 o 2 ramas, completamos con ejes guía neutros
  const ejesRadar = $derived.by(() => {
    const lista = ejesBase.map((h) => ({
      nombre: h.nombre,
      categoria: h.categoria,
      puntos: h.puntos,
      esGuia: false
    }));
    while (lista.length > 0 && lista.length < 3) {
      lista.push({
        nombre: `Eje disponible ${lista.length + 1}`,
        categoria: 'FRAMEWORK',
        puntos: 0,
        esGuia: true
      });
    }
    return lista;
  });

  // Escala dinámica: mínimo 5 puntos de tope para que el progreso inicial sea claro y proporcional
  const maxEscala = $derived(
    Math.max(5, ...ejesRadar.map((e) => e.puntos), ...habilidadesFiltradas.map((h) => h.puntos))
  );

  const nivelesAnillos = [0.2, 0.4, 0.6, 0.8, 1];

  // Geometría del SVG con margen amplio para etiquetas en móvil y escritorio
  const CX = 270;
  const CY = 210;
  const RADIO_MAX = 118;
  const RADIO_ETIQUETA = 152;

  function anguloDeIndice(i: number, total: number): number {
    return (Math.PI * 2 * i) / total - Math.PI / 2;
  }

  function puntoEnRadar(i: number, total: number, fraccion: number) {
    const ang = anguloDeIndice(i, total);
    const r = RADIO_MAX * Math.max(0, Math.min(1, fraccion));
    return {
      x: Number((CX + r * Math.cos(ang)).toFixed(2)),
      y: Number((CY + r * Math.sin(ang)).toFixed(2))
    };
  }

  const poligonosAnillos = $derived(
    nivelesAnillos.map((nivel) => {
      const n = ejesRadar.length || 6;
      const puntos = Array.from({ length: n }, (_, i) => {
        const p = puntoEnRadar(i, n, nivel);
        return `${p.x},${p.y}`;
      }).join(' ');
      return {
        nivel,
        valorEscala: Math.round(maxEscala * nivel),
        puntos,
        yEtiqueta: Number((CY - RADIO_MAX * nivel).toFixed(2))
      };
    })
  );

  const geometriaEjes = $derived(
    ejesRadar.map((eje, i) => {
      const n = ejesRadar.length;
      const ang = anguloDeIndice(i, n);
      const extremo = puntoEnRadar(i, n, 1);
      const fraccionValor = maxEscala > 0 ? eje.puntos / maxEscala : 0;
      const vertice = puntoEnRadar(i, n, Math.max(0.04, fraccionValor));
      const posEtiqueta = {
        x: Number((CX + RADIO_ETIQUETA * Math.cos(ang)).toFixed(2)),
        y: Number((CY + RADIO_ETIQUETA * Math.sin(ang)).toFixed(2))
      };
      const cos = Math.cos(ang);
      const textAnchor: 'start' | 'middle' | 'end' =
        cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';

      return {
        ...eje,
        indice: i,
        extremo,
        vertice,
        posEtiqueta,
        textAnchor,
        porcentaje: Math.min(100, Math.round((eje.puntos / maxEscala) * 100))
      };
    })
  );

  const puntosPoligonoDatos = $derived(
    geometriaEjes.map((g) => `${g.vertice.x},${g.vertice.y}`).join(' ')
  );

  const ejeSeleccionado = $derived(
    indiceActivo !== null && geometriaEjes[indiceActivo] ? geometriaEjes[indiceActivo] : null
  );

  function truncarEtiqueta(texto: string, max = 18): string {
    return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
  }

  function RangoDominio(puntos: number): { texto: string; clase: string } {
    if (puntos >= 5) return { texto: 'Maestro', clase: 'text-amber-300 border-amber-400/40 bg-amber-400/10' };
    if (puntos >= 3) return { texto: 'Especialista', clase: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' };
    if (puntos >= 1) return { texto: 'Practicante', clase: 'text-tezcat-cyan border-tezcat-cyan/40 bg-tezcat-cyan/10' };
    return { texto: 'Sin iniciar', clase: 'text-tezcat-textMuted border-tezcat-border bg-tezcat-surfaceAlt' };
  }
</script>

<div class="space-y-5">
  <!-- Controles de filtrado de categoría y leyenda (TW-20) -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-tezcat-border/70 pb-3.5">
    <div class="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar ramas por categoría">
      {#each [
        { id: 'TODAS', texto: 'Todas las ramas' },
        { id: 'LENGUAJE DE PROGRAMACIÓN', texto: '🖥️ Lenguajes' },
        { id: 'FRAMEWORK', texto: '🧩 Frameworks' }
      ] as tab (tab.id)}
        {@const activo = filtro === tab.id}
        <button
          type="button"
          role="tab"
          aria-selected={activo}
          onclick={() => {
            filtro = tab.id as FiltroCategoria;
            indiceActivo = null;
          }}
          class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
            {activo
              ? 'border-tezcat-cyan/60 bg-tezcat-cyan/15 text-tezcat-cyan shadow-sm'
              : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:border-tezcat-borderHighlight hover:text-white'}"
        >
          {tab.texto}
        </button>
      {/each}
    </div>

    <div class="flex flex-wrap items-center gap-3 font-mono text-[10px] text-tezcat-textSecondary">
      <span class="inline-flex items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-tezcat-cyan"></span>
        Lenguaje de Programación
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-purple-400"></span>
        Framework
      </span>
      <span class="rounded border border-tezcat-border bg-tezcat-bg px-2 py-0.5 text-tezcat-gold">
        Escala máx: {maxEscala} pts
      </span>
    </div>
  </div>

  {#if habilidadesFiltradas.length === 0}
    <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 px-6 py-10 text-center">
      <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">radar</span>
      <p class="mt-2 text-sm font-semibold text-tezcat-textPrimary">
        Aún no hay ramas registradas en esta categoría
      </p>
      <p class="mt-1 max-w-md text-xs text-tezcat-textSecondary">
        Completa tareas opcionales del Muro de Oportunidades con etiquetas técnicas para visualizar tu polígono de experiencia en la gráfica radar.
      </p>
    </div>
  {:else}
    <div class="grid items-start gap-6 lg:grid-cols-12">
      <!-- Lienzo SVG de la Gráfica Radar Interactiva (7 columnas) -->
      <div class="rounded-2xl border border-tezcat-border bg-tezcat-bg/80 p-3 sm:p-4 lg:col-span-7">
        <div class="relative mx-auto w-full max-w-[540px]">
          <svg
            viewBox="0 0 540 420"
            class="h-auto w-full select-none overflow-visible"
            role="img"
            aria-label="Gráfica radar de ramas de habilidad técnica"
          >
            <defs>
              <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.42" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0.16" />
              </radialGradient>
            </defs>

            <!-- Anillos concéntricos de escala -->
            {#each poligonosAnillos as anillo (anillo.nivel)}
              <polygon
                points={anillo.puntos}
                fill="none"
                stroke={anillo.nivel === 1 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(148, 163, 184, 0.16)'}
                stroke-width={anillo.nivel === 1 ? '1.5' : '1'}
                stroke-dasharray={anillo.nivel === 1 ? undefined : '3 3'}
              />
              <text
                x={CX + 6}
                y={anillo.yEtiqueta + 10}
                class="fill-slate-400 font-mono text-[9px]"
              >
                {anillo.valorEscala}
              </text>
            {/each}

            <!-- Ejes radiales desde el centro -->
            {#each geometriaEjes as eje (eje.indice)}
              <line
                x1={CX}
                y1={CY}
                x2={eje.extremo.x}
                y2={eje.extremo.y}
                stroke={indiceActivo === eje.indice ? 'rgba(6, 182, 212, 0.7)' : 'rgba(148, 163, 184, 0.22)'}
                stroke-width={indiceActivo === eje.indice ? '1.8' : '1'}
              />
            {/each}

            <!-- Polígono de experiencia acumulada -->
            {#if geometriaEjes.length >= 3}
              <polygon
                points={puntosPoligonoDatos}
                fill="url(#radarFillGrad)"
                stroke="#06b6d4"
                stroke-width="2.4"
                stroke-linejoin="round"
                class="transition-all duration-500"
              />
            {/if}

            <!-- Vértices interactivos y etiquetas legibles en escritorio y móvil -->
            {#each geometriaEjes as eje (eje.indice)}
              {@const esLenguaje = eje.categoria === 'LENGUAJE DE PROGRAMACIÓN'}
              {@const seleccionado = indiceActivo === eje.indice}

              <!-- Punto en el vértice de datos -->
              <g
                role="button"
                tabindex="0"
                aria-label="{eje.nombre}: {eje.puntos} puntos de habilidad"
                class="cursor-pointer focus:outline-none"
                onmouseenter={() => (indiceActivo = eje.indice)}
                onmouseleave={() => (indiceActivo = null)}
                onclick={() => (indiceActivo = indiceActivo === eje.indice ? null : eje.indice)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    indiceActivo = indiceActivo === eje.indice ? null : eje.indice;
                  }
                }}
              >
                {#if seleccionado}
                  <circle
                    cx={eje.vertice.x}
                    cy={eje.vertice.y}
                    r="9"
                    fill={esLenguaje ? 'rgba(6, 182, 212, 0.25)' : 'rgba(192, 132, 252, 0.25)'}
                  />
                {/if}
                <circle
                  cx={eje.vertice.x}
                  cy={eje.vertice.y}
                  r={seleccionado ? '5.5' : '4'}
                  fill={eje.esGuia ? '#475569' : esLenguaje ? '#06b6d4' : '#c084fc'}
                  stroke="#0f172a"
                  stroke-width="1.8"
                />

                <!-- Etiqueta exterior con nombre de la rama y puntaje -->
                <text
                  x={eje.posEtiqueta.x}
                  y={eje.posEtiqueta.y - 4}
                  text-anchor={eje.textAnchor}
                  class="font-sans text-[11px] font-bold transition-colors {eje.esGuia
                    ? 'fill-slate-500'
                    : seleccionado
                      ? 'fill-tezcat-cyan'
                      : 'fill-slate-100'}"
                >
                  {truncarEtiqueta(eje.nombre)}
                </text>
                <text
                  x={eje.posEtiqueta.x}
                  y={eje.posEtiqueta.y + 11}
                  text-anchor={eje.textAnchor}
                  class="font-mono text-[10px] font-semibold {eje.esGuia
                    ? 'fill-slate-600'
                    : esLenguaje
                      ? 'fill-cyan-300'
                      : 'fill-purple-300'}"
                >
                  {eje.esGuia ? 'Referencia' : `Nivel ${eje.puntos} (${eje.puntos} pts)`}
                </text>
              </g>
            {/each}
          </svg>

          <!-- Pie informativo del vértice activo -->
          <div class="mt-1 flex items-center justify-between rounded-xl border border-tezcat-border/70 bg-tezcat-card/80 px-3.5 py-2 text-xs">
            {#if ejeSeleccionado && !ejeSeleccionado.esGuia}
              <div class="flex items-center gap-2">
                <span
                  class="size-2.5 rounded-full {ejeSeleccionado.categoria === 'LENGUAJE DE PROGRAMACIÓN'
                    ? 'bg-tezcat-cyan'
                    : 'bg-purple-400'}"
                ></span>
                <span class="font-bold text-white">{ejeSeleccionado.nombre}</span>
                <span class="font-mono text-[10px] text-tezcat-textSecondary">
                  ({ejeSeleccionado.categoria})
                </span>
              </div>
              <span class="font-mono text-xs font-bold text-tezcat-cyan">
                Nivel {ejeSeleccionado.puntos} · {ejeSeleccionado.puntos} {ejeSeleccionado.puntos === 1 ? 'punto' : 'puntos'}
              </span>
            {:else}
              <span class="text-[11px] text-tezcat-textSecondary">
                Pasa el cursor o toca cualquier vértice del radar para inspeccionar la rama.
              </span>
              <span class="font-mono text-[10px] text-tezcat-textMuted">
                {habilidadesFiltradas.length} {habilidadesFiltradas.length === 1 ? 'rama activa' : 'ramas activas'}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Consulta Numérica Accesible de Ramas (5 columnas - Criterio 4 de TW-20) -->
      <div class="space-y-3 lg:col-span-5">
        <div class="flex items-center justify-between">
          <h3 class="font-mono text-[11px] font-bold tracking-wider text-tezcat-textSecondary uppercase">
            Valores Numéricos por Rama
          </h3>
          <span class="font-mono text-[10px] text-tezcat-cyan">
            Consulta directa sin depender del gráfico
          </span>
        </div>

        <div class="max-h-96 space-y-2.5 overflow-y-auto pr-1" role="list" aria-label="Valores numéricos de ramas de habilidad">
          {#each habilidadesFiltradas as skill, idx (skill.nombre)}
            {@const rango = RangoDominio(skill.puntos)}
            {@const esLenguaje = skill.categoria === 'LENGUAJE DE PROGRAMACIÓN'}
            {@const porcentaje = Math.min(100, Math.round((skill.puntos / maxEscala) * 100))}
            {@const resaltado = indiceActivo === idx}

            <div
              role="listitem"
              onmouseenter={() => {
                if (idx < MAX_EJES_RADAR) indiceActivo = idx;
              }}
              onmouseleave={() => (indiceActivo = null)}
              class="rounded-xl border p-3.5 transition-all
                {resaltado
                  ? 'border-tezcat-cyan bg-tezcat-surfaceAlt/80 shadow-md'
                  : 'border-tezcat-border bg-tezcat-bg hover:border-tezcat-cyan/40'}"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-xs font-bold text-white">{skill.nombre}</span>
                    <span class="rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase {rango.clase}">
                      {rango.texto}
                    </span>
                  </div>
                  <p class="mt-0.5 font-mono text-[10px] text-tezcat-textSecondary">
                    {esLenguaje ? '🖥️ Lenguaje de Programación' : '🧩 Framework'}
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <span class="rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-2.5 py-1 font-mono text-xs font-bold text-white">
                    {skill.puntos} {skill.puntos === 1 ? 'pt' : 'pts'}
                  </span>
                  <p class="mt-1 font-mono text-[10px] text-tezcat-cyan">
                    Nivel {skill.puntos}
                  </p>
                </div>
              </div>

              <div class="mt-2.5">
                <div class="mb-1 flex justify-between font-mono text-[10px] text-tezcat-textMuted">
                  <span>Dominio relativo ({porcentaje}%)</span>
                  <span>{skill.puntos} / {maxEscala} pts</span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
                  <div
                    class="h-full transition-all duration-300 {esLenguaje ? 'bg-tezcat-cyan' : 'bg-purple-400'}"
                    style="width: {porcentaje}%"
                  ></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
