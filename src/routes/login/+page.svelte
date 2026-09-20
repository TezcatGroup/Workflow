<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
</script>

<main class="mx-auto max-w-md p-8">
  <h1 class="mb-6 text-2xl font-bold">Acceso a Tezcat Workflow</h1>
  <form method="POST" class="grid gap-4">
    <label>Correo o usuario <input class="w-full border p-2" name="email" type="text" autocomplete="username" required /></label>
    <label>Contraseña <input class="w-full border p-2" name="password" type="password" required /></label>
    <button class="rounded bg-slate-900 p-2 text-white" type="submit">Entrar</button>
  </form>
  {#if form?.error}<p role="alert" class="mt-4 text-red-700">{form.error}</p>{/if}
</main>
