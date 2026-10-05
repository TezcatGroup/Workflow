<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import EncabezadoApp from '$lib/components/EncabezadoApp.svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const roles = ['MIEMBRO', 'ENCARGADO', 'ADMIN'];
  const colorRol: Record<string, string> = {
    ADMIN: 'text-tezcat-gold', ENCARGADO: 'text-tezcat-cyan', MIEMBRO: 'text-tezcat-textPrimary'
  };

  // Clases compartidas (un solo lugar para cambiar el estilo de todos los campos)
  const campo = 'w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2 text-sm text-tezcat-textPrimary placeholder-tezcat-textMuted focus:border-tezcat-cyan focus:outline-none [&>option]:bg-tezcat-card';
  const etiqueta = 'mb-1 block font-mono text-[10px] tracking-wider text-tezcat-textSecondary uppercase';
  const boton = 'rounded-lg border border-tezcat-border bg-tezcat-surfaceAlt px-3 py-2 text-sm font-semibold transition-colors hover:border-tezcat-borderHighlight';

  // Filtros en vivo (solo en el navegador, no consultan al servidor)
  let q = $state(''), fRol = $state(''), fDep = $state(''), fEstado = $state('');
  const nombreDep = $derived(new Map(data.departamentos.map((d) => [d.id, d.nombre])));
  const lista = $derived(data.usuarios.filter((u) => {
    const texto = `${u.nombre} ${u.email} ${u.rol} ${nombreDep.get(u.departamentoId ?? '') ?? ''}`.toLowerCase();
    return (!q || texto.includes(q.toLowerCase().trim()))
      && (!fRol || u.rol === fRol)
      && (!fDep || (fDep === '_' ? !u.departamentoId : u.departamentoId === fDep))
      && (!fEstado || String(u.activo) === fEstado);
  }));
  const activos = $derived(data.usuarios.filter((u) => u.activo).length);

  // Contraseña temporal aleatoria (mínimo 12 caracteres que exige el servidor)
  let password = $state('');
  function generar() {
    const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#@$%';
    password = Array.from(crypto.getRandomValues(new Uint32Array(16)), (n) => abc[n % abc.length]).join('');
  }
</script>

<svelte:head><title>Usuarios | Tezcat Workflow</title></svelte:head>

<div class="min-h-screen bg-tezcat-bg font-sans text-tezcat-textPrimary antialiased">
  <EncabezadoApp user={data.admin} />

  <main class="mx-auto max-w-7xl space-y-6 px-4 py-6">
    <!-- Título y contadores -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="flex items-center gap-2 font-mono text-[10px] tracking-wider text-tezcat-cyan uppercase">
          <span class="size-2 rounded-full bg-tezcat-cyan"></span>Módulo de usuarios
        </p>
        <h1 class="mt-1 text-3xl font-bold tracking-tight">Administración de usuarios y cuentas</h1>
        <p class="mt-1 max-w-2xl text-sm text-tezcat-textSecondary">Crea accesos y gestiona roles, departamentos y estado de las cuentas.</p>
      </div>
      <div class="flex gap-6 rounded-lg border border-tezcat-border bg-tezcat-card px-4 py-2 font-mono">
        <div><p class="text-[10px] text-tezcat-textSecondary uppercase">Activos</p><p class="text-xl font-bold">{activos}</p></div>
        <div><p class="text-[10px] text-tezcat-textSecondary uppercase">Total</p><p class="text-xl font-bold text-tezcat-cyan">{data.usuarios.length}</p></div>
      </div>
    </div>

    <!-- Respuesta del servidor (crear / actualizar / estado) -->
    {#if form?.error}
      <p role="alert" class="rounded-lg border border-tezcat-danger/40 bg-tezcat-danger/10 p-3 text-sm text-red-300">{form.error}</p>
    {/if}
    {#if form?.ok}
      <p role="status" class="rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 p-3 text-sm text-tezcat-cyan">{form.ok}</p>
    {/if}

    <!-- Crear usuario: los name (nombre, email, password, rol, departamentoId) los lee el servidor -->
    <Panel titulo="Crear usuario" descripcion="Registro de identidad y asignación de rol">
      <form method="POST" action="?/crear" use:enhance class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label><span class={etiqueta}>Nombre completo</span>
          <input class={campo} name="nombre" maxlength="160" placeholder="ej. Valeria Mendoza" required /></label>
        <label><span class={etiqueta}>Correo electrónico</span>
          <input class={campo} name="email" type="email" placeholder="usuario@tezcat.io" required /></label>
        <label>
          <span class="flex items-center justify-between">
            <span class={etiqueta}>Contraseña inicial (mín. 12)</span>
            <button type="button" onclick={generar} class="mb-1 font-mono text-[10px] text-tezcat-cyan hover:underline">Generar</button>
          </span>
          <input class="{campo} font-mono" name="password" bind:value={password} minlength="12" required />
        </label>
        <label><span class={etiqueta}>Rol</span>
          <select class={campo} name="rol">{#each roles as r}<option>{r}</option>{/each}</select></label>
        <label><span class={etiqueta}>Departamento</span>
          <select class={campo} name="departamentoId">
            <option value="">Sin departamento</option>
            {#each data.departamentos as d (d.id)}<option value={d.id}>{d.nombre}</option>{/each}
          </select></label>
        <button type="submit" class="self-end rounded-lg bg-linear-to-r from-tezcat-cyan to-teal-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-glow-cyan hover:opacity-90">Dar de alta</button>
      </form>
    </Panel>

    <!-- Búsqueda y filtros -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-xl font-bold">Gestión de cuentas</h2>
          <p class="font-mono text-[10px] text-tezcat-textSecondary uppercase">Directorio y edición de perfiles</p>
        </div>
        <span class="rounded bg-tezcat-surfaceAlt px-2 py-1 font-mono text-[11px] text-tezcat-textSecondary">{lista.length} {lista.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      <div class="grid gap-3 rounded-xl border border-tezcat-border bg-tezcat-card p-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <input class={campo} bind:value={q} placeholder="Buscar por nombre, correo, departamento o rol…" aria-label="Buscar" />
        <select class={campo} bind:value={fRol} aria-label="Filtrar por rol">
          <option value="">Rol: todos</option>{#each roles as r}<option>{r}</option>{/each}
        </select>
        <select class={campo} bind:value={fDep} aria-label="Filtrar por departamento">
          <option value="">Depto: todos</option><option value="_">Sin asignar</option>
          {#each data.departamentos as d (d.id)}<option value={d.id}>{d.nombre}</option>{/each}
        </select>
        <select class={campo} bind:value={fEstado} aria-label="Filtrar por estado">
          <option value="">Estado: todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
        </select>
      </div>

      <!-- Cuentas -->
      {#each lista as u (u.id)}
        <article class="space-y-3 rounded-xl border border-tezcat-border bg-tezcat-card p-4 transition-colors hover:bg-tezcat-surface">
          <div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span class="font-sans text-sm font-semibold">{u.email}</span>
            <span class="rounded px-2 py-0.5 {u.activo ? 'bg-tezcat-cyan/10 text-tezcat-cyan' : 'bg-tezcat-danger/10 text-red-300'}">{u.activo ? 'Activa' : 'Inactiva'}</span>
            <span class="rounded bg-tezcat-surfaceAlt px-2 py-0.5 {colorRol[u.rol] ?? ''}">{u.rol}</span>
          </div>

          <form method="POST" action="?/actualizar" use:enhance class="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="id" value={u.id} />
            <label><span class={etiqueta}>Nombre completo</span>
              <input class={campo} name="nombre" value={u.nombre} required /></label>
            <label><span class={etiqueta}>Rol</span>
              <select class={campo} name="rol" value={u.rol}>{#each roles as r}<option>{r}</option>{/each}</select></label>
            <label><span class={etiqueta}>Departamento</span>
              <select class={campo} name="departamentoId" value={u.departamentoId ?? ''}>
                <option value="">Sin departamento</option>
                {#each data.departamentos as d (d.id)}<option value={d.id}>{d.nombre}</option>{/each}
              </select></label>
            <button class="{boton} self-end" type="submit">Guardar cambios</button>
          </form>

          <form method="POST" action="?/estado" use:enhance>
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="activo" value={u.activo ? 'false' : 'true'} />
            <button type="submit" class="font-mono text-xs hover:underline {u.activo ? 'text-red-300' : 'text-tezcat-cyan'}">
              {u.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </button>
          </form>
        </article>
      {:else}
        <p class="rounded-xl border border-tezcat-border bg-tezcat-card p-8 text-center text-sm text-tezcat-textSecondary">
          No se encontraron usuarios con esos filtros.
        </p>
      {/each}
    </section>
  </main>
</div>