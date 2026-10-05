<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();

  // Pantallas que ya traen el encabezado nuevo. Al rediseñar otra, agrégala aquí.
  const conEncabezadoNuevo = ['/admin', '/admin/usuarios'];
</script>

{#if !conEncabezadoNuevo.includes(page.url.pathname)}
  <header class="border-b bg-white px-8 py-4">
    <nav class="mx-auto flex max-w-6xl gap-6">
      <a href="/dashboard" class="font-semibold">Tezcat Workflow</a>
      <a href="/admin/usuarios" class="underline">Usuarios</a>
      <a href="/admin/departamentos" class="underline">Departamentos</a>
      <a href="/admin/auditoria" class="underline">Auditoría</a>
    </nav>
  </header>
{/if}
{@render children()}