<script lang="ts">
  import { enhance } from '$app/forms';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const claseEtiqueta =
    'mb-1.5 block font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';

  const campo =
    'block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 px-3.5 font-sans text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card';

  const recompensas = $derived(data.recompensas);
  const canjes = $derived(data.canjes);
  
  let accionEnProgreso = $state(false);

  const fecha = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—';
</script>

<svelte:head><title>Recompensas | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.admin} />
  <main class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    
    <!-- Encabezado -->
    <div class="mb-6">
      <p class="font-mono text-[11px] font-semibold tracking-widest text-tezcat-cyan uppercase">
        TW-21 · Panel de Administración
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Catálogo de Recompensas</h1>
      <p class="mt-1.5 max-w-3xl text-xs text-tezcat-textSecondary">
        Administra los beneficios internos que los integrantes pueden canjear con sus monedas (puntos).
        Controla el stock, ajusta costos y procesa las solicitudes de entrega.
      </p>
    </div>

    <!-- Avisos -->
    {#if form?.error}
      <div role="alert" class="mb-5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300">
        <span class="material-symbols-outlined text-sm inline-block align-middle mr-1">error</span>
        {form.error}
      </div>
    {/if}
    {#if form?.ok}
      <div role="status" class="mb-5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs text-emerald-300">
        <span class="material-symbols-outlined text-sm inline-block align-middle mr-1">check_circle</span>
        {form.ok}
      </div>
    {/if}

    <div class="grid gap-8 lg:grid-cols-12">
      <!-- COLUMNA IZQUIERDA: CREAR Y LISTAR RECOMPENSAS -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Formulario de creación -->
        <form
          method="POST"
          action="?/crear"
          class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-5 shadow-2xl backdrop-blur-md"
          use:enhance={() => {
            accionEnProgreso = true;
            return async ({ update }) => { accionEnProgreso = false; await update(); };
          }}
        >
          <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase mb-4">
            Dar de alta nueva recompensa
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class={claseEtiqueta} for="nombre">Nombre del producto / beneficio *</label>
              <input id="nombre" name="nombre" maxlength="160" required placeholder="Ej. Tarjeta de Regalo Amazon $50 USD" class={campo} />
            </div>
            <div class="sm:col-span-2">
              <label class={claseEtiqueta} for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows="2" placeholder="Detalles, términos o formato de entrega..." class={campo}></textarea>
            </div>
            <div>
              <label class={claseEtiqueta} for="costoPuntos">Costo (Monedas) *</label>
              <input id="costoPuntos" name="costoPuntos" type="number" min="1" required placeholder="Ej. 1500" class={campo} />
            </div>
            <div>
              <label class={claseEtiqueta} for="stock">Stock disponible</label>
              <input id="stock" name="stock" type="number" min="0" placeholder="Vacío = Ilimitado" class={campo} />
            </div>
            <div class="sm:col-span-2">
              <label class={claseEtiqueta} for="imagenUrl">URL de la imagen (opcional)</label>
              <input id="imagenUrl" name="imagenUrl" type="url" placeholder="https://..." class={campo} />
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button type="submit" disabled={accionEnProgreso} class="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50">
              <span class="material-symbols-outlined text-sm">add_shopping_cart</span> Crear Recompensa
            </button>
          </div>
        </form>

        <!-- Listado (Edición en línea) -->
        {#if recompensas.length > 0}
          <div class="space-y-4">
            <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
              Catálogo existente ({recompensas.length})
            </p>
            {#each recompensas as rec (rec.id)}
              <form method="POST" action="?/actualizar" class="rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 shadow-xl backdrop-blur-md {rec.stock === 0 ? 'opacity-80' : ''}" use:enhance>
                <input type="hidden" name="id" value={rec.id} />
                
                <!-- Encabezado de la tarjeta -->
                <div class="mb-3 flex items-start gap-3">
                  {#if rec.imagenUrl}
                    <img src={rec.imagenUrl} alt="Img" class="size-12 rounded object-cover border border-tezcat-border/50" />
                  {:else}
                    <div class="flex size-12 items-center justify-center rounded border border-tezcat-border/50 bg-tezcat-surfaceAlt">
                      <span class="material-symbols-outlined text-tezcat-textMuted">image</span>
                    </div>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <input name="nombre" value={rec.nombre} required class="w-full bg-transparent font-bold text-white focus:outline-none focus:border-b border-tezcat-cyan" />
                    <input name="descripcion" value={rec.descripcion ?? ''} placeholder="Sin descripción" class="w-full bg-transparent text-xs text-tezcat-textSecondary mt-0.5 focus:outline-none focus:border-b border-tezcat-cyan" />
                  </div>
                  {#if !rec.activo}
                    <span class="rounded bg-red-400/10 border border-red-400/30 px-2 py-0.5 font-mono text-[10px] text-red-300">Inactiva</span>
                  {:else if rec.stock === 0}
                    <span class="rounded bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 font-mono text-[10px] text-amber-300">Agotado</span>
                  {/if}
                </div>

                <!-- Controles en línea -->
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end">
                  <div>
                    <label class={claseEtiqueta} for="costo-{rec.id}">Costo (Monedas)</label>
                    <input id="costo-{rec.id}" name="costoPuntos" type="number" min="1" required value={rec.costoPuntos} class={campo} />
                  </div>
                  <div>
                    <label class={claseEtiqueta} for="stock-{rec.id}">Stock</label>
                    <input id="stock-{rec.id}" name="stock" type="number" min="0" value={rec.stock ?? ''} placeholder="Ilimitado" class={campo} />
                  </div>
                  <div>
                    <label class={claseEtiqueta} for="activo-{rec.id}">Estado</label>
                    <select id="activo-{rec.id}" name="activo" class={campo} value={String(rec.activo)}>
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </div>
                  <button type="submit" class="inline-flex h-[42px] items-center justify-center rounded-xl border border-tezcat-border px-4 text-xs font-semibold text-tezcat-textSecondary transition-colors hover:border-tezcat-cyan hover:text-tezcat-cyan">
                    Guardar
                  </button>
                </div>
                <input type="hidden" name="imagenUrl" value={rec.imagenUrl ?? ''} />
              </form>
            {/each}
          </div>
        {:else}
          <div class="rounded-2xl border border-dashed border-tezcat-border p-10 text-center">
            <span class="material-symbols-outlined text-4xl text-tezcat-textMuted">storefront</span>
            <p class="mt-2 text-sm font-bold text-white">Catálogo vacío</p>
            <p class="text-xs text-tezcat-textSecondary">Registra la primera recompensa para que los miembros puedan canjear sus monedas.</p>
          </div>
        {/if}
      </div>

      <!-- COLUMNA DERECHA: GESTIÓN DE CANJES -->
      <div class="lg:col-span-5 space-y-4">
        <p class="font-mono text-[10px] font-semibold tracking-wider text-tezcat-textSecondary uppercase">
          Operaciones de Canje Recientes
        </p>
        
        {#if canjes.length === 0}
          <div class="rounded-2xl border border-dashed border-tezcat-border bg-tezcat-bg/50 p-8 text-center text-tezcat-textMuted">
            <span class="material-symbols-outlined text-3xl">receipt_long</span>
            <p class="mt-2 text-xs font-semibold">No hay canjes registrados.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each canjes as c (c.id)}
              <div class="rounded-xl border border-tezcat-border/80 bg-tezcat-card/90 p-4 shadow-md backdrop-blur-md">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-bold text-white">{c.recompensaNombre ?? 'Recompensa eliminada'}</p>
                    <p class="text-[11px] text-tezcat-textSecondary">Solicitado por: <strong class="text-tezcat-cyan">{c.usuarioNombre}</strong></p>
                    <p class="font-mono text-[10px] text-tezcat-textMuted mt-1">{fecha(c.creadoEn)} · {c.puntosGastados} Monedas</p>
                  </div>
                  
                  {#if c.estado === 'PENDIENTE'}
                    <span class="rounded bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">Pendiente</span>
                  {:else if c.estado === 'ENTREGADO'}
                    <span class="rounded bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300">Entregado</span>
                  {:else}
                    <span class="rounded bg-red-400/15 border border-red-400/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-red-300">Cancelado</span>
                  {/if}
                </div>

                {#if c.estado === 'PENDIENTE'}
                  <div class="mt-4 flex gap-2 border-t border-tezcat-border/50 pt-3">
                    <form method="POST" action="?/resolverCanje" use:enhance class="flex-1">
                      <input type="hidden" name="canjeId" value={c.id} />
                      <input type="hidden" name="accion" value="ENTREGAR" />
                      <button type="submit" class="w-full rounded-lg bg-emerald-400/10 border border-emerald-400/30 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20">
                        Marcar Entregado
                      </button>
                    </form>
                    <form method="POST" action="?/resolverCanje" use:enhance class="flex-1">
                      <input type="hidden" name="canjeId" value={c.id} />
                      <input type="hidden" name="accion" value="CANCELAR" />
                      <button type="submit" class="w-full rounded-lg bg-red-400/10 border border-red-400/30 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/20" title="Reembolsará monedas al usuario">
                        Cancelar
                      </button>
                    </form>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>