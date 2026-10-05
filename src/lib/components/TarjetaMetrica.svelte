<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    titulo, descripcion, icono, href, valor, etiqueta = '', acento = 'cyan', children
  }: {
    titulo: string;
    descripcion: string;
    icono: string;
    href: string;
    valor?: number;
    etiqueta?: string;
    acento?: 'cyan' | 'gold';
    children?: Snippet; // contenido extra opcional (barras, notas...)
  } = $props();

  // Clases completas (no armadas con texto) para que Tailwind las detecte
  const color = { cyan: 'text-tezcat-cyan', gold: 'text-tezcat-gold' };
</script>

<a
  {href}
  class="group flex flex-col justify-between rounded-xl border border-tezcat-border bg-tezcat-card p-5 shadow-md transition-colors hover:border-tezcat-borderHighlight hover:bg-tezcat-surface"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <h2 class="font-semibold">{titulo}</h2>
      <p class="mt-1 text-xs text-tezcat-textSecondary">{descripcion}</p>
    </div>
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tezcat-surfaceAlt transition-transform group-hover:scale-105 {color[acento]}"
    >
      <span class="material-symbols-outlined">{icono}</span>
    </span>
  </div>

  <div class="mt-6 flex items-end justify-between gap-3">
    {#if valor !== undefined}
      <p>
        <span class="font-mono text-4xl font-bold tracking-tight">{valor}</span>
        <span class="font-mono text-xs text-tezcat-textSecondary">{etiqueta}</span>
      </p>
    {:else}
      <span></span>
    {/if}
    <span class="flex items-center gap-0.5 font-mono text-xs group-hover:underline {color[acento]}">
      Abrir <span class="material-symbols-outlined text-sm">chevron_right</span>
    </span>
  </div>

  {#if children}<div class="mt-4">{@render children()}</div>{/if}
</a>