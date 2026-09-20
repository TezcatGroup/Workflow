<script lang="ts">
  let { children } = $props();
</script>

<header class="border-b bg-white px-8 py-4">
  <nav class="mx-auto flex max-w-6xl gap-6">
    <a href="/dashboard" class="font-semibold">Tezcat Workflow</a>
    <a href="/admin/usuarios" class="underline">Usuarios</a>
    <a href="/admin/departamentos" class="underline">Departamentos</a>
    <a href="/admin/auditoria" class="underline">Auditoría</a>
  </nav>
</header>
{@render children()}
