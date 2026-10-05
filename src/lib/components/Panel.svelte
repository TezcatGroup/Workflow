<script lang="ts">
  import type { Snippet } from 'svelte';

  let { titulo, descripcion = '', acento = 'cyan', acciones, children }: {
    titulo: string;
    descripcion?: string;
    acento?: 'cyan' | 'gold';
    acciones?: Snippet; // botones o enlaces a la derecha del título
    children: Snippet;
  } = $props();

  const punto = { cyan: 'bg-tezcat-cyan', gold: 'bg-tezcat-gold' };
</script>

<section class="rounded-xl border border-tezcat-border bg-tezcat-card p-5 shadow-md">
  <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <span class="size-2 rounded-sm {punto[acento]}"></span>{titulo}
      </h2>
      {#if descripcion}<p class="mt-0.5 text-xs text-tezcat-textSecondary">{descripcion}</p>{/if}
    </div>
    {@render acciones?.()}
  </header>
  {@render children()}
</section>