<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();

  let verPassword = $state(false);
  let enviando = $state(false);
</script>

<svelte:head>
  <title>Acceso a Tezcat Workflow</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    rel="stylesheet"
  />
</svelte:head>

<main
  class="cyber-grid relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased selection:bg-tezcat-cyan selection:text-slate-950"
>
  <!-- Luces de ambiente -->
  <div class="pointer-events-none absolute -top-40 left-1/2 h-[350px] w-[550px] -translate-x-1/2 rounded-full bg-tezcat-cyan/10 blur-[120px]"></div>
  <div class="pointer-events-none absolute right-1/4 bottom-0 h-[250px] w-[350px] rounded-full bg-tezcat-tealDeep/10 blur-[100px]"></div>

  <div class="relative z-10 flex w-full max-w-[440px] flex-col items-center px-4 py-12">
    <!-- Encabezado -->
    <div class="mb-8 w-full text-center">
      <div class="mb-4 inline-flex items-center justify-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-tezcat-cyan to-tezcat-tealDeep shadow-glow-cyan">
          <span class="material-symbols-outlined text-2xl font-bold text-slate-950">token</span>
        </div>
      </div>
      <p class="mb-2 font-mono text-xl font-bold tracking-wider text-white uppercase">Tezcat</p>
      <h1 class="mb-1.5 text-2xl font-bold tracking-tight text-white">Acceso a Tezcat Workflow</h1>
      <p class="text-xs text-tezcat-textSecondary">Ingresa tus credenciales para acceder a la plataforma</p>
    </div>

    <!-- Tarjeta -->
    <div class="w-full rounded-2xl border border-tezcat-border/80 bg-tezcat-card/90 p-7 shadow-2xl backdrop-blur-md sm:p-8">
      {#if form?.error}
        <div
          role="alert"
          class="mb-4 flex items-start gap-2.5 rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-xs text-red-300"
        >
          <span class="material-symbols-outlined shrink-0 text-base">error</span>
          <span>{form.error}</span>
        </div>
      {/if}

      <!-- method POST + names email/password: el servidor los espera así -->
      <form method="POST" class="space-y-4" onsubmit={() => (enviando = true)}>
        <div>
          <label class="mb-1.5 block text-xs font-medium text-tezcat-textSecondary" for="email">
            Correo electrónico
          </label>
          <div class="relative rounded-xl shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg">alternate_email</span>
            </div>
            <input
              id="email"
              name="email"
              type="text"
              autocomplete="username"
              placeholder="nombre@tezcat.local"
              required
              class="block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 pr-4 pl-10 font-sans text-sm text-white placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-medium text-tezcat-textSecondary" for="password">
            Contraseña
          </label>
          <div class="relative rounded-xl shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tezcat-textMuted">
              <span class="material-symbols-outlined text-lg">lock</span>
            </div>
            <input
              id="password"
              name="password"
              type={verPassword ? 'text' : 'password'}
              autocomplete="current-password"
              placeholder="••••••••••••"
              required
              class="block w-full rounded-xl border border-tezcat-border bg-tezcat-bg py-2.5 pr-11 pl-10 font-mono text-sm text-white placeholder-tezcat-textMuted transition-colors focus:border-tezcat-cyan focus:ring-1 focus:ring-tezcat-cyan focus:outline-none"
            />
            <button
              type="button"
              onclick={() => (verPassword = !verPassword)}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-tezcat-textMuted hover:text-tezcat-textPrimary focus:outline-none"
            >
              <span class="material-symbols-outlined text-lg">{verPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            disabled={enviando}
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-tezcat-cyan to-teal-400 px-4 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-glow-cyan transition-all hover:from-tezcat-cyanHover hover:to-teal-300 focus:ring-2 focus:ring-tezcat-cyan/60 focus:outline-none active:scale-[0.99] disabled:opacity-70"
          >
            {#if enviando}
              <span class="material-symbols-outlined animate-spin text-lg">refresh</span>
              <span>Verificando…</span>
            {:else}
              <span>Iniciar sesión</span>
              <span class="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            {/if}
          </button>
        </div>
      </form>
    </div>

    <p class="mt-8 text-center font-mono text-[11px] text-tezcat-textMuted">© Tezcat Group</p>
  </div>

  <div class="hud-scanner"></div>
</main>

<style>
  .cyber-grid {
    background-image: radial-gradient(circle at 1px 1px, rgba(76, 215, 246, 0.08) 1px, transparent 0);
    background-size: 32px 32px;
  }
  .hud-scanner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #4cd7f6, transparent);
    opacity: 0.4;
    pointer-events: none;
    animation: scan 8s linear infinite;
  }
  @keyframes scan {
    0% { top: 0%; opacity: 0; }
    15% { opacity: 0.6; }
    85% { opacity: 0.6; }
    100% { top: 100%; opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hud-scanner { animation: none; opacity: 0; }
  }
  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>