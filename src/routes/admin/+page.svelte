<script lang="ts">
  import type { PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import TarjetaMetrica from '$lib/components/TarjetaMetrica.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data }: { data: PageData } = $props();

  const r = $derived(data.resumen);
  const pctActivos = $derived(r.usuarios ? Math.round((r.activos / r.usuarios) * 100) : 0);

  // Distribución de personal: las 4 áreas con más integrantes
  const personal = $derived(data.areas.reduce((suma, a) => suma + a.integrantes, 0));
  const barras = $derived([...data.areas].sort((a, b) => b.integrantes - a.integrantes).slice(0, 4));
  const colores = ['bg-tezcat-gold', 'bg-tezcat-cyan', 'bg-tezcat-tealDeep', 'bg-tezcat-borderHighlight'];

  const iniciales = (nombre: string) =>
    nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const colorRol: Record<string, string> = {
    ADMIN: 'text-tezcat-gold', ENCARGADO: 'text-tezcat-cyan', MIEMBRO: 'text-tezcat-textPrimary'
  };
</script>

<svelte:head>
  <title>Panel de administración · Tezcat Workflow</title>
</svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.admin} />

  <main class="mx-auto max-w-7xl space-y-6 px-4 py-6">
    <!-- Banner -->
    <section class="relative overflow-hidden rounded-xl border border-tezcat-border bg-tezcat-card p-6 shadow-xl">
      <div class="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full bg-tezcat-cyan/5 blur-3xl"></div>

      <div class="relative flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
        <span class="flex items-center gap-1.5 rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-cyan">
          <span class="size-1.5 rounded-full bg-tezcat-cyan motion-safe:animate-pulse"></span>
          Administrador activo
        </span>
        <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 text-tezcat-gold">Rol: {data.admin.rol}</span>
      </div>

      <h1 class="relative mt-3 text-3xl font-bold tracking-tight">Hola, {data.admin.nombre}</h1>
      <p class="relative mt-1 text-sm text-tezcat-textSecondary">Consola de administración / Control central</p>

      <p class="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase">
        <span><span class="text-tezcat-cyan">Usuarios activos:</span> {r.activos}/{r.usuarios}</span>
        <span><span class="text-tezcat-cyan">Sesiones activas:</span> {r.sesiones}</span>
        <span><span class="text-tezcat-cyan">Eventos de auditoría:</span> {r.auditoria}</span>
      </p>
    </section>

    <!-- Tarjetas -->
    <section aria-label="Resumen" class="grid gap-4 md:grid-cols-2">
      <TarjetaMetrica titulo="Usuarios registrados" descripcion="Directorio de cuentas y accesos"
        icono="badge" href="/admin/usuarios" valor={r.activos} etiqueta="activos" acento="cyan">
        <div class="mb-1 flex justify-between font-mono text-[10px] text-tezcat-textSecondary uppercase">
          <span>Cuentas activas</span><span class="text-tezcat-cyan">{pctActivos}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
          <div class="h-full bg-tezcat-cyan" style="width: {pctActivos}%"></div>
        </div>
      </TarjetaMetrica>

      <TarjetaMetrica titulo="Departamentos" descripcion="Áreas de la organización"
        icono="hub" href="/admin/departamentos" valor={r.departamentos} etiqueta="áreas activas" acento="gold">
        <div class="mb-1 font-mono text-[10px] text-tezcat-textSecondary uppercase">Distribución de personal</div>
        <div class="flex h-2 overflow-hidden rounded-full bg-tezcat-surfaceAlt">
          {#each barras as a, i (a.id)}
            {#if personal > 0 && a.integrantes > 0}
              <div class="h-full {colores[i]}" style="width: {(a.integrantes / personal) * 100}%" title="{a.nombre}: {a.integrantes}"></div>
            {/if}
          {/each}
        </div>
      </TarjetaMetrica>
    </section>

    <!-- Últimos usuarios -->
    <Panel titulo="Últimos usuarios registrados" descripcion="Altas más recientes del directorio">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="bg-tezcat-bg font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase">
              <th class="rounded-l px-3 py-2.5">Usuario</th>
              <th class="px-3 py-2.5">Rol</th>
              <th class="px-3 py-2.5">Departamento</th>
              <th class="rounded-r px-3 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recientes as u (u.id)}
              <tr class="transition-colors even:bg-tezcat-bg/40 hover:bg-tezcat-surface">
                <td class="px-3 py-3">
                  <div class="flex items-center gap-3">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tezcat-surfaceAlt font-mono text-xs text-tezcat-cyan">{iniciales(u.nombre)}</span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{u.nombre}</p>
                      <p class="truncate font-mono text-[11px] text-tezcat-textSecondary">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[11px] {colorRol[u.rol] ?? ''}">{u.rol}</span>
                </td>
                <td class="px-3 py-3">{u.departamento ?? '—'}</td>
                <td class="px-3 py-3">
                  {#if u.activo}
                    <span class="rounded bg-tezcat-cyan/10 px-2 py-0.5 font-mono text-[11px] text-tezcat-cyan">Activo</span>
                  {:else}
                    <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 font-mono text-[11px] text-tezcat-textSecondary">Inactivo</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-tezcat-textSecondary">
        <span>Mostrando {data.recientes.length} de {r.usuarios} registros</span>
        <a href="/admin/usuarios" class="text-tezcat-cyan hover:underline">Ver todos los usuarios →</a>
      </div>
    </Panel>

    <!-- Departamentos -->
    <Panel titulo="Departamentos activos" descripcion="Integrantes activos por área" acento="gold">
      {#snippet acciones()}
        <a href="/admin/departamentos" class="font-mono text-[11px] text-tezcat-cyan hover:underline">Gestionar áreas →</a>
      {/snippet}
      {#if data.areas.length === 0}
        <p class="text-sm text-tezcat-textSecondary">Aún no hay departamentos activos.</p>
      {:else}
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each data.areas as a (a.id)}
            <div class="flex items-center justify-between gap-3 rounded-xl bg-tezcat-bg p-4 transition-colors hover:bg-tezcat-surface">
              <span class="truncate font-semibold">{a.nombre}</span>
              <span class="shrink-0 font-mono text-xs text-tezcat-gold">{a.integrantes} integrantes</span>
            </div>
          {/each}
        </div>
      {/if}
    </Panel>
  </main>

  <footer class="mx-auto max-w-7xl px-4 pb-8 font-mono text-[11px] text-tezcat-textMuted">© Tezcat Group</footer>
</div>