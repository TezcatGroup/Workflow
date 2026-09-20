<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const enlaces: Record<string, string> = {
    usuarios: '/admin/usuarios', departamentos: '/admin/departamentos',
    auditoria: '/admin/auditoria', equipo: '/equipo', perfil: '/perfil'
  };
</script>

<main class="mx-auto max-w-5xl p-8">
  <h1 class="text-2xl font-bold">Hola, {data.user.nombre}</h1>
  <p class="mb-6">Rol: {data.user.rol}</p>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each data.widgets as widget}
      <a href={enlaces[widget]} class="block rounded border bg-white p-4 hover:border-slate-500 hover:shadow-sm">
        <h2 class="font-semibold capitalize">{widget}</h2>
        {#each Object.entries(data.metricas) as [clave, valor]}
          {#if clave.toLowerCase().includes(widget) || (widget === 'equipo' && clave === 'miembrosActivos')}
            <p>{valor} {clave}</p>
          {/if}
        {/each}
      </a>
    {/each}
  </div>
  <form action="/logout" method="POST" class="mt-6">
    <button class="underline" type="submit">Cerrar sesión</button>
  </form>
</main>
