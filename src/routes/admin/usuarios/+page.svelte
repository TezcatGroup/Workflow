<script lang="ts">
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Usuarios | Tezcat Workflow</title></svelte:head>
<main class="mx-auto max-w-6xl p-8">
  <h1 class="mb-6 text-2xl font-bold">Administración de usuarios</h1>
  {#if form?.error}<p role="alert" class="mb-4 text-red-700">{form.error}</p>{/if}
  {#if form?.ok}<p role="status" class="mb-4 text-green-700">{form.ok}</p>{/if}

  <section class="mb-8 rounded border bg-white p-5">
    <h2 class="mb-4 text-lg font-semibold">Crear usuario</h2>
    <form method="POST" action="?/crear" class="grid gap-3 md:grid-cols-2">
      <label>Nombre <input class="w-full rounded border p-2" name="nombre" maxlength="160" required /></label>
      <label>Correo <input class="w-full rounded border p-2" name="email" type="email" required /></label>
      <label>Contraseña inicial <input class="w-full rounded border p-2" name="password" type="password" minlength="12" required /></label>
      <label>Rol
        <select class="w-full rounded border p-2" name="rol">
          <option>MIEMBRO</option><option>ENCARGADO</option><option>ADMIN</option>
        </select>
      </label>
      <label>Departamento
        <select class="w-full rounded border p-2" name="departamentoId">
          <option value="">Sin departamento</option>
          {#each data.departamentos as dep}<option value={dep.id}>{dep.nombre}</option>{/each}
        </select>
      </label>
      <button class="self-end rounded bg-slate-900 p-2 text-white" type="submit">Crear</button>
    </form>
  </section>

  <section class="grid gap-4">
    <h2 class="text-lg font-semibold">Cuentas</h2>
    {#each data.usuarios as usuario}
      <article class="rounded border bg-white p-4">
        <p class="mb-3 text-sm text-slate-600">{usuario.email} · {usuario.activo ? 'Activa' : 'Inactiva'}</p>
        <form method="POST" action="?/actualizar" class="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="id" value={usuario.id} />
          <label>Nombre <input class="w-full rounded border p-2" name="nombre" value={usuario.nombre} required /></label>
          <label>Rol
            <select class="w-full rounded border p-2" name="rol" value={usuario.rol}>
              <option>ADMIN</option><option>ENCARGADO</option><option>MIEMBRO</option>
            </select>
          </label>
          <label>Departamento
            <select class="w-full rounded border p-2" name="departamentoId" value={usuario.departamentoId ?? ''}>
              <option value="">Sin departamento</option>
              {#each data.departamentos as dep}<option value={dep.id}>{dep.nombre}</option>{/each}
            </select>
          </label>
          <button class="self-end rounded border p-2" type="submit">Guardar cambios</button>
        </form>
        <form method="POST" action="?/estado" class="mt-3">
          <input type="hidden" name="id" value={usuario.id} />
          <input type="hidden" name="activo" value={usuario.activo ? 'false' : 'true'} />
          <button class="text-sm underline" type="submit">{usuario.activo ? 'Desactivar' : 'Activar'}</button>
        </form>
      </article>
    {/each}
  </section>
</main>
