<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Recompensa = (typeof data.recompensas)[number];
  type ClaveCategoria = 'TODAS' | 'TIEMPO' | 'COMPRAS' | 'CURSOS' | 'MERCH' | 'VIP';
  type CriterioOrden = 'MENOR_PRECIO' | 'MAYOR_PRECIO' | 'RELEVANCIA' | 'DISPONIBLES';
  type TabBitacora = 'CANJES' | 'MOVIMIENTOS';

  const categorias: { id: ClaveCategoria; etiqueta: string }[] = [
    { id: 'TODAS', etiqueta: 'Todas las Recompensas' },
    { id: 'TIEMPO', etiqueta: 'Días Libres y Tiempo Personal' },
    { id: 'COMPRAS', etiqueta: 'Tarjetas de Regalo y Compras' },
    { id: 'CURSOS', etiqueta: 'Cursos y Certificaciones' },
    { id: 'MERCH', etiqueta: 'Merchandise Oficial' },
    { id: 'VIP', etiqueta: 'Reconocimientos VIP' }
  ];

  // Clasifica automáticamente cada recompensa creada por el Admin según su nombre/descripción
  function detectarCategoria(r: Recompensa): Exclude<ClaveCategoria, 'TODAS'> {
    const texto = `${r.nombre} ${r.descripcion ?? ''}`.toLowerCase();
    if (/(viernes|libre|día|dia|vacaciones|descanso|flex|tiempo|salud)/.test(texto)) return 'TIEMPO';
    if (/(tarjeta|gift|amazon|steam|uber|cupón|cupon|usd|compra|vale)/.test(texto)) return 'COMPRAS';
    if (/(curso|certificaci|examen|cloud|aws|azure|gcp|libro|taller|voucher)/.test(texto)) return 'CURSOS';
    if (/(termo|tumbler|playera|sudadera|mochila|taza|gorra|merch|silla|teclado)/.test(texto)) return 'MERCH';
    return 'VIP';
  }

  const etiquetaCategoria: Record<Exclude<ClaveCategoria, 'TODAS'>, string> = {
    TIEMPO: 'Tiempo Libre y Salud',
    COMPRAS: 'Compras y Flexibilidad',
    CURSOS: 'Cursos y Certificaciones',
    MERCH: 'Merchandise Oficial',
    VIP: 'Reconocimiento Exclusivo'
  };

  const iconoEntregaCategoria: Record<Exclude<ClaveCategoria, 'TODAS'>, { icono: string; texto: string }> = {
    TIEMPO: { icono: 'event_available', texto: 'Coordinación con Encargado' },
    COMPRAS: { icono: 'bolt', texto: 'Emisión Digital' },
    CURSOS: { icono: 'terminal', texto: 'Entrega de Voucher Digital' },
    MERCH: { icono: 'inventory_2', texto: 'Entrega Física / Oficina' },
    VIP: { icono: 'workspace_premium', texto: 'Asignación Directa' }
  };

  // Estados reactivos (Svelte 5 Runes)
  let categoriaActiva = $state<ClaveCategoria>('TODAS');
  let ordenActivo = $state<CriterioOrden>('RELEVANCIA');
  let busqueda = $state('');
  let tabBitacora = $state<TabBitacora>('CANJES');
  let recompensaPorConfirmar = $state<Recompensa | null>(null);
  let procesandoCompra = $state(false);
  let seccionHistorialRef = $state<HTMLElement | null>(null);

  const saldo = $derived(data.saldo);

  const desbloqueablesCount = $derived(
    data.recompensas.filter((r) => (r.stock === null || r.stock > 0) && saldo >= r.costoPuntos).length
  );

  const recompensasFiltradas = $derived.by(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = data.recompensas.filter((r) => {
      if (categoriaActiva !== 'TODAS' && detectarCategoria(r) !== categoriaActiva) return false;
      if (!q) return true;
      return (
        r.nombre.toLowerCase().includes(q) ||
        (r.descripcion ?? '').toLowerCase().includes(q)
      );
    });

    return [...filtradas].sort((a, b) => {
      if (ordenActivo === 'MENOR_PRECIO') return a.costoPuntos - b.costoPuntos;
      if (ordenActivo === 'MAYOR_PRECIO') return b.costoPuntos - a.costoPuntos;
      if (ordenActivo === 'DISPONIBLES') {
        const dispA = (a.stock === null || a.stock > 0) && saldo >= a.costoPuntos ? 0 : 1;
        const dispB = (b.stock === null || b.stock > 0) && saldo >= b.costoPuntos ? 0 : 1;
        return dispA - dispB || a.costoPuntos - b.costoPuntos;
      }
      return a.nombre.localeCompare(b.nombre);
    });
  });

  function abrirModalCompra(rec: Recompensa) {
    const agotado = rec.stock !== null && rec.stock <= 0;
    if (agotado || saldo < rec.costoPuntos) return;
    recompensaPorConfirmar = rec;
  }

  function cerrarModalCompra() {
    if (!procesandoCompra) {
      recompensaPorConfirmar = null;
    }
  }

  function irAlHistorial() {
    seccionHistorialRef?.scrollIntoView({ behavior: 'smooth' });
  }

  const formatearPuntos = (n: number) => n.toLocaleString('es-MX');
  const fechaCorta = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—';
</script>

<svelte:head>
  <title>Tienda de Recompensas | Tezcat Workflow</title>
</svelte:head>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && recompensaPorConfirmar && !procesandoCompra) {
      cerrarModalCompra();
    }
  }}
/>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.user} />

  <main class="mx-auto max-w-7xl px-4 py-8 sm:py-10">
    <!-- Avisos de operación (Confirmación de canje o motivo de rechazo - TW-22) -->
    {#if form?.error}
      <div
        role="alert"
        class="mb-6 flex items-center gap-2.5 rounded-xl border border-tezcat-danger/40 bg-tezcat-danger/10 p-4 text-xs text-red-300 shadow-lg"
      >
        <span class="material-symbols-outlined shrink-0 text-base">error</span>
        <span>{form.error}</span>
      </div>
    {/if}

    {#if form?.ok}
      <div
        role="status"
        class="mb-6 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-xs text-emerald-300 shadow-lg"
      >
        <span class="flex items-center gap-2">
          <span class="material-symbols-outlined shrink-0 text-base">check_circle</span>
          <span>{form.ok}</span>
        </span>
      </div>
    {/if}

    <!-- Encabezado Principal: Billetera y Telemetría (TW-17 · TW-22) -->
    <section class="relative mb-8 overflow-hidden rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      <div class="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-amber-400/5 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-tezcat-cyan/5 blur-3xl"></div>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded bg-tezcat-surfaceAlt px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-tezcat-cyan uppercase">
              Módulo de Beneficios
            </span>
            <span class="font-mono text-[10px] text-tezcat-textMuted">•</span>
            <span class="font-mono text-[10px] tracking-widest text-tezcat-textSecondary uppercase">
              Almacén Central Tezcat
            </span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Tienda de Recompensas
          </h1>
          <p class="max-w-2xl text-xs leading-relaxed text-tezcat-textSecondary sm:text-sm">
            Convierte las monedas obtenidas por tus contribuciones en tareas opcionales en beneficios reales para tu bienestar, desarrollo técnico y equipamiento profesional.
          </p>
        </div>

        <!-- Tarjeta de Saldo Disponible y Acceso a Historial -->
        <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-tezcat-border bg-tezcat-bg/90 p-4 shadow-inner sm:flex-nowrap">
          <div class="flex items-center gap-3.5 pr-2">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-md">
              <span class="material-symbols-outlined text-2xl">monetization_on</span>
            </div>
            <div>
              <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
                Saldo Disponible
              </p>
              <div class="mt-0.5 flex items-baseline gap-1.5">
                <span class="font-mono text-2xl font-bold tracking-tight text-amber-300 sm:text-3xl">
                  {formatearPuntos(saldo)}
                </span>
                <span class="font-mono text-xs font-bold text-tezcat-gold uppercase">PTS / Monedas</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 border-t border-tezcat-border pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <div class="inline-flex items-center gap-1.5 rounded-lg border border-tezcat-cyan/30 bg-tezcat-cyan/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-tezcat-cyan uppercase">
              <span class="material-symbols-outlined text-sm">verified</span>
              <span>Nivel {data.nivel} · {desbloqueablesCount} disponibles</span>
            </div>
            <button
              type="button"
              onclick={irAlHistorial}
              class="inline-flex items-center justify-between gap-2 rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-2.5 py-1.5 text-xs font-semibold text-tezcat-textPrimary transition-colors hover:border-tezcat-cyan/50 hover:text-tezcat-cyan"
            >
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-tezcat-cyan">history</span>
                Historial de Canjes ({data.canjes.length})
              </span>
              <span class="material-symbols-outlined text-sm text-tezcat-textMuted">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Barra de Categorías, Buscador y Ordenamiento -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
        {#each categorias as cat (cat.id)}
          {@const activa = categoriaActiva === cat.id}
          <button
            type="button"
            onclick={() => (categoriaActiva = cat.id)}
            class="shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all
              {activa
                ? 'border-tezcat-cyan/50 bg-tezcat-surfaceAlt text-tezcat-cyan shadow-sm'
                : 'border-tezcat-border/70 bg-tezcat-card/70 text-tezcat-textSecondary hover:border-tezcat-borderHighlight hover:text-white'}"
          >
            {cat.etiqueta}
            {#if cat.id === 'TODAS'}
              <span class="ml-1 font-mono text-[10px] opacity-75">({data.recompensas.length})</span>
            {/if}
          </button>
        {/each}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-tezcat-textMuted">
            search
          </span>
          <input
            type="search"
            bind:value={busqueda}
            placeholder="Buscar recompensa..."
            aria-label="Buscar recompensa"
            class="w-48 rounded-xl border border-tezcat-border bg-tezcat-card py-2 pr-3 pl-8 text-xs text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none sm:w-56"
          />
        </div>

        <label for="orden-tienda" class="hidden font-mono text-[10px] text-tezcat-textMuted uppercase sm:inline">
          Ordenar:
        </label>
        <select
          id="orden-tienda"
          bind:value={ordenActivo}
          class="rounded-xl border border-tezcat-border bg-tezcat-card px-3 py-2 text-xs text-tezcat-textPrimary focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card"
        >
          <option value="RELEVANCIA">Orden alfabético</option>
          <option value="DISPONIBLES">Disponibles para mi saldo primero</option>
          <option value="MENOR_PRECIO">Puntos: Menor a Mayor</option>
          <option value="MAYOR_PRECIO">Puntos: Mayor a Menor</option>
        </select>
      </div>
    </div>

    <!-- Cuadrícula del Catálogo de Recompensas -->
    {#if data.recompensas.length === 0}
      <div class="mb-10 rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/40 p-12 text-center">
        <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">storefront</span>
        <p class="mt-3 text-base font-bold text-white">Aún no hay recompensas activas en la tienda</p>
        <p class="mx-auto mt-1 max-w-md text-xs text-tezcat-textSecondary">
          Cuando el administrador registre productos o beneficios en el catálogo de recompensas, aparecerán aquí para que puedas canjear tus monedas.
        </p>
      </div>
    {:else if recompensasFiltradas.length === 0}
      <div class="mb-10 rounded-2xl border border-dashed border-tezcat-border bg-tezcat-card/40 p-10 text-center">
        <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">filter_alt_off</span>
        <p class="mt-2 text-sm font-bold text-white">No se encontraron recompensas con este filtro</p>
        <button
          type="button"
          onclick={() => {
            categoriaActiva = 'TODAS';
            busqueda = '';
          }}
          class="mt-3 rounded-xl border border-tezcat-cyan/50 bg-tezcat-cyan/10 px-4 py-2 text-xs font-bold text-tezcat-cyan hover:bg-tezcat-cyan/20"
        >
          Ver todas las recompensas
        </button>
      </div>
    {:else}
      <div class="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each recompensasFiltradas as rec (rec.id)}
          {@const cat = detectarCategoria(rec)}
          {@const infoEntrega = iconoEntregaCategoria[cat]}
          {@const agotado = rec.stock !== null && rec.stock <= 0}
          {@const alcanzaSaldo = saldo >= rec.costoPuntos}
          {@const bloqueado = agotado || !alcanzaSaldo}
          {@const faltantes = Math.max(0, rec.costoPuntos - saldo)}
          {@const porcentajeProgreso = Math.min(100, Math.round((Math.max(0, saldo) / rec.costoPuntos) * 100))}

          <article
            class="group flex flex-col justify-between rounded-2xl border p-5 shadow-xl backdrop-blur-md transition-all duration-300
              {bloqueado
                ? 'border-tezcat-border/60 bg-tezcat-card/60'
                : 'border-tezcat-border/80 bg-tezcat-card/90 hover:border-tezcat-cyan/50'}"
          >
            <div>
              <!-- Contenedor de Imagen y Badges -->
              <div class="relative mb-4 h-48 w-full overflow-hidden rounded-xl border border-tezcat-border/60 bg-tezcat-bg">
                {#if rec.imagenUrl}
                  <img
                    src={rec.imagenUrl}
                    alt={rec.nombre}
                    class="h-full w-full object-cover transition-transform duration-500
                      {bloqueado ? 'grayscale opacity-45' : 'group-hover:scale-105'}"
                  />
                {:else}
                  <div class="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-tezcat-surfaceAlt to-tezcat-bg text-tezcat-cyan/40">
                    <span class="material-symbols-outlined text-6xl">redeem</span>
                  </div>
                {/if}

                <!-- Overlay de Candado si está agotado o no alcanza el saldo -->
                {#if bloqueado}
                  <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[2px]">
                    <span class="material-symbols-outlined mb-1 text-3xl text-tezcat-textSecondary">
                      {agotado ? 'production_quantity_limits' : 'lock'}
                    </span>
                    <span class="font-mono text-[10px] font-bold tracking-wider text-white uppercase">
                      {agotado ? 'Artículo Agotado' : 'Saldo Insuficiente'}
                    </span>
                  </div>
                {/if}

                <!-- Etiqueta superior izquierda: Categoría -->
                <div class="absolute top-2.5 left-2.5 rounded-md border border-tezcat-border/80 bg-slate-950/85 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-tezcat-cyan uppercase backdrop-blur-md">
                  {etiquetaCategoria[cat]}
                </div>

                <!-- Etiqueta superior derecha: Stock disponible -->
                <div
                  class="absolute top-2.5 right-2.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase backdrop-blur-md
                    {agotado
                      ? 'border-red-400/50 bg-red-950/90 text-red-300'
                      : 'border-tezcat-border/80 bg-slate-950/85 text-tezcat-textSecondary'}"
                >
                  {#if rec.stock === null}
                    Stock: Ilimitado
                  {:else if rec.stock <= 0}
                    Agotado (0)
                  {:else}
                    Stock: {rec.stock} disp.
                  {/if}
                </div>

                <!-- Etiqueta inferior derecha: Precio en Monedas / PTS -->
                <div class="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full border border-amber-400/40 bg-slate-950/90 px-3 py-1 shadow-lg backdrop-blur-md">
                  <span class="material-symbols-outlined text-sm text-amber-300">monetization_on</span>
                  <span class="font-mono text-xs font-bold text-amber-300">
                    {formatearPuntos(rec.costoPuntos)} PTS
                  </span>
                </div>
              </div>

              <!-- Título y Descripción -->
              <h2 class="text-base font-bold text-white transition-colors {!bloqueado ? 'group-hover:text-tezcat-cyan' : ' opacity-85'}">
                {rec.nombre}
              </h2>
              <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-tezcat-textSecondary">
                {rec.descripcion || 'Beneficio oficial del catálogo interno de Tezcat Workflow.'}
              </p>

              <!-- Barra de progreso de déficit cuando al usuario le faltan puntos -->
              {#if !alcanzaSaldo && !agotado}
                <div class="mt-4 rounded-xl border border-tezcat-border bg-tezcat-bg p-3">
                  <div class="mb-1.5 flex items-center justify-between font-mono text-[10px]">
                    <span class="text-tezcat-textSecondary uppercase">Progreso de Puntos</span>
                    <span class="font-bold text-amber-300">Te faltan {formatearPuntos(faltantes)} PTS</span>
                  </div>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-tezcat-surfaceAlt">
                    <div
                      class="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style="width: {porcentajeProgreso}%"
                    ></div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Pie de Tarjeta y Botón de Acción -->
            <div class="mt-4 flex items-center justify-between gap-2 rounded-xl border border-tezcat-border/60 bg-tezcat-bg/70 p-2.5">
              {#if agotado}
                <span class="flex items-center gap-1 font-mono text-[10px] text-red-300">
                  <span class="material-symbols-outlined text-sm">block</span>
                  Sin unidades disponibles
                </span>
                <button
                  type="button"
                  disabled
                  class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-tezcat-surfaceAlt px-3.5 py-2 text-xs font-semibold text-tezcat-textMuted opacity-60"
                >
                  <span class="material-symbols-outlined text-sm">lock</span>
                  Agotado
                </button>
              {:else if !alcanzaSaldo}
                <span class="font-mono text-[10px] text-tezcat-textMuted">Bloqueado temporalmente</span>
                <button
                  type="button"
                  disabled
                  class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-tezcat-surfaceAlt px-3.5 py-2 text-xs font-semibold text-tezcat-textMuted opacity-60"
                >
                  <span class="material-symbols-outlined text-sm">lock</span>
                  Insuficiente
                </button>
              {:else}
                <div class="flex items-center gap-1.5 font-mono text-[10px] font-medium text-tezcat-cyan">
                  <span class="material-symbols-outlined text-sm">{infoEntrega.icono}</span>
                  <span class="truncate">{infoEntrega.texto}</span>
                </div>
                <button
                  type="button"
                  onclick={() => abrirModalCompra(rec)}
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 active:scale-95"
                >
                  <span class="material-symbols-outlined text-sm">redeem</span>
                  <span>Canjear Premio</span>
                </button>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}

    <!-- Sección Inferior: Protocolo Logístico y Bitácora de Canjes / Movimientos (TW-17 · TW-22) -->
    <div bind:this={seccionHistorialRef} class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Protocolo de Asignación y Logística (5 Columnas) -->
      <div class="flex flex-col justify-between rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-xl backdrop-blur-md lg:col-span-5">
        <div>
          <div class="mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-xl text-tezcat-cyan">local_shipping</span>
            <h2 class="text-base font-bold text-white">Protocolo de Asignación y Logística</h2>
          </div>
          <p class="mb-4 text-xs leading-relaxed text-tezcat-textSecondary">
            Todo canje descuenta una sola vez las monedas de tu saldo y genera un registro permanente verificable en la consola de administración.
          </p>

          <div class="space-y-3">
            <div class="flex items-start gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5">
              <span class="material-symbols-outlined mt-0.5 text-lg text-tezcat-cyan">verified_user</span>
              <div>
                <p class="text-xs font-bold text-white">Control de Stock en Tiempo Real</p>
                <p class="mt-0.5 text-[11px] leading-relaxed text-tezcat-textSecondary">
                  Al confirmar tu compra, el sistema reserva tu unidad inmediatamente. Si un artículo llega a 0 unidades, se inhabilita automáticamente.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5">
              <span class="material-symbols-outlined mt-0.5 text-lg text-amber-300">currency_exchange</span>
              <div>
                <p class="text-xs font-bold text-white">Garantía de Reembolso Automático</p>
                <p class="mt-0.5 text-[11px] leading-relaxed text-tezcat-textSecondary">
                  Si una solicitud es cancelada por administración, tus monedas y el stock del producto se restauran íntegramente a tu cuenta.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between border-t border-tezcat-border/60 pt-3 font-mono text-[10px] text-tezcat-textMuted">
          <span>TEZCAT-STORE · TW-17 · TW-22</span>
          <a href="/muro" class="inline-flex items-center gap-1 font-semibold text-tezcat-cyan hover:underline">
            <span>Ganar más monedas en el Muro</span>
            <span class="material-symbols-outlined text-xs">north_east</span>
          </a>
        </div>
      </div>

      <!-- Tus Últimos Canjes y Libro Mayor de Puntos (7 Columnas) -->
      <div class="flex flex-col justify-between rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-6 shadow-xl backdrop-blur-md lg:col-span-7">
        <div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick={() => (tabBitacora = 'CANJES')}
                class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
                  {tabBitacora === 'CANJES'
                    ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                    : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
              >
                Tus Últimos Canjes ({data.canjes.length})
              </button>
              <button
                type="button"
                onclick={() => (tabBitacora = 'MOVIMIENTOS')}
                class="rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all
                  {tabBitacora === 'MOVIMIENTOS'
                    ? 'border-tezcat-cyan/50 bg-tezcat-cyan/15 text-tezcat-cyan'
                    : 'border-tezcat-border bg-tezcat-bg text-tezcat-textSecondary hover:text-white'}"
              >
                Libro Mayor de Puntos ({data.movimientos.length})
              </button>
            </div>
          </div>

          {#if tabBitacora === 'CANJES'}
            {#if data.canjes.length === 0}
              <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center">
                <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">redeem</span>
                <p class="mt-2 text-xs font-semibold text-white">Aún no has realizado ningún canje</p>
                <p class="mt-1 text-[11px] text-tezcat-textSecondary">
                  Tus compras de recompensas y su estado de entrega aparecerán listados aquí.
                </p>
              </div>
            {:else}
              <div class="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {#each data.canjes as c (c.id)}
                  <div class="flex flex-col justify-between gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 transition-colors hover:border-tezcat-borderHighlight sm:flex-row sm:items-center">
                    <div class="flex items-center gap-3">
                      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tezcat-surfaceAlt text-tezcat-cyan">
                        <span class="material-symbols-outlined text-base">redeem</span>
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-xs font-bold text-white">
                          {c.recompensaNombre ?? 'Recompensa del catálogo'}
                        </p>
                        <p class="mt-0.5 font-mono text-[10px] text-tezcat-textSecondary">
                          Folio #{c.id.slice(0, 8).toUpperCase()} · Solicitado el {fechaCorta(c.creadoEn)}
                          {#if c.entregadoEn}
                            · Entregado el {fechaCorta(c.entregadoEn)}
                          {/if}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between gap-3 sm:justify-end">
                      <span class="font-mono text-xs font-bold text-amber-300">
                        {c.estado === 'CANCELADO' ? 'Reembolsado' : `-${formatearPuntos(c.puntosGastados)} PTS`}
                      </span>

                      {#if c.estado === 'PENDIENTE'}
                        <span class="rounded border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 uppercase">
                          Pendiente
                        </span>
                      {:else if c.estado === 'ENTREGADO'}
                        <span class="rounded border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 uppercase">
                          Entregado
                        </span>
                      {:else}
                        <span class="rounded border border-red-400/30 bg-red-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 uppercase">
                          Cancelado
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            {#if data.movimientos.length === 0}
              <div class="rounded-xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center">
                <span class="material-symbols-outlined text-3xl text-tezcat-textMuted">account_balance_wallet</span>
                <p class="mt-2 text-xs font-semibold text-white">Sin movimientos de puntos todavía</p>
                <p class="mt-1 text-[11px] text-tezcat-textSecondary">
                  Aquí verás cada abono por tareas opcionales y cada descuento único por canje.
                </p>
              </div>
            {:else}
              <div class="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {#each data.movimientos as mov (mov.id)}
                  {@const esAbono = mov.cantidad >= 0}
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 text-xs">
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-white">{mov.motivo}</p>
                      <p class="mt-0.5 font-mono text-[10px] text-tezcat-textMuted">
                        {fechaCorta(mov.creadoEn)}
                      </p>
                    </div>
                    <span
                      class="shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold
                        {esAbono
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                          : 'border-amber-400/40 bg-amber-400/10 text-amber-300'}"
                    >
                      {esAbono ? `+${formatearPuntos(mov.cantidad)}` : formatearPuntos(mov.cantidad)} PTS
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-tezcat-border/60 pt-3 font-mono text-[10px] text-tezcat-textMuted">
          <span>Balance Histórico Canjeado: {formatearPuntos(data.totalCanjeadoHistorico)} PTS</span>
          <a href="/perfil" class="font-sans text-xs font-semibold text-tezcat-cyan hover:underline">
            Ver mi perfil completo →
          </a>
        </div>
      </div>
    </div>

    <!-- =============================================================== -->
    <!-- MODAL EMERGENTE DE CONFIRMACIÓN DE COMPRA (TW-17 · TW-22)       -->
    <!-- =============================================================== -->
    {#if recompensaPorConfirmar}
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Cerrar ventana de confirmación"
          onclick={cerrarModalCompra}
          class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        ></button>

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-canje"
          class="relative w-full max-w-md overflow-hidden rounded-2xl border border-tezcat-cyan/40 bg-tezcat-card p-6 shadow-2xl"
        >
          <div class="flex items-start gap-3.5">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-300">
              <span class="material-symbols-outlined text-2xl">redeem</span>
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-mono text-[10px] font-bold tracking-wider text-tezcat-cyan uppercase">
                Confirmar Canje de Recompensa · TW-22
              </p>
              <h2 id="titulo-modal-canje" class="mt-0.5 truncate text-base font-bold text-white">
                {recompensaPorConfirmar.nombre}
              </h2>
            </div>
          </div>

          {#if recompensaPorConfirmar.imagenUrl}
            <img
              src={recompensaPorConfirmar.imagenUrl}
              alt={recompensaPorConfirmar.nombre}
              class="mt-4 h-36 w-full rounded-xl border border-tezcat-border object-cover"
            />
          {/if}

          <p class="mt-3 text-xs leading-relaxed text-tezcat-textSecondary">
            {recompensaPorConfirmar.descripcion || '¿Deseas confirmar el canje de este beneficio con tus monedas disponibles?'}
          </p>

          <!-- Desglose contable de la operación -->
          <div class="mt-4 space-y-2 rounded-xl border border-tezcat-border bg-tezcat-bg p-3.5 font-mono text-xs">
            <div class="flex items-center justify-between text-tezcat-textSecondary">
              <span>Tu saldo actual:</span>
              <span class="font-bold text-white">{formatearPuntos(saldo)} PTS</span>
            </div>
            <div class="flex items-center justify-between text-amber-300">
              <span>Costo de la recompensa:</span>
              <span class="font-bold">-{formatearPuntos(recompensaPorConfirmar.costoPuntos)} PTS</span>
            </div>
            <div class="flex items-center justify-between border-t border-tezcat-border pt-2 text-emerald-300">
              <span>Saldo restante tras el canje:</span>
              <span class="font-bold">
                {formatearPuntos(saldo - recompensaPorConfirmar.costoPuntos)} PTS
              </span>
            </div>
          </div>

          <form
            method="POST"
            action="?/canjear"
            class="mt-5 flex justify-end gap-3"
            use:enhance={() => {
              procesandoCompra = true;
              return async ({ update }) => {
                procesandoCompra = false;
                recompensaPorConfirmar = null;
                await update();
              };
            }}
          >
            <input type="hidden" name="recompensaId" value={recompensaPorConfirmar.id} />
            <button
              type="button"
              onclick={cerrarModalCompra}
              disabled={procesandoCompra}
              class="rounded-xl border border-tezcat-border px-4 py-2.5 text-xs font-semibold text-tezcat-textSecondary transition-colors hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesandoCompra}
              class="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-glow-cyan transition-all hover:opacity-95 disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-base">
                {procesandoCompra ? 'sync' : 'check_circle'}
              </span>
              <span>{procesandoCompra ? 'Procesando…' : 'Confirmar compra'}</span>
            </button>
          </form>
        </div>
      </div>
    {/if}
  </main>
</div>
