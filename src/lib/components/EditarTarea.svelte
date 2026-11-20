<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  type Etiqueta = { id: string; nombre: string; activo: boolean };
  let { tarea, asignadas, disponibles, abierto = $bindable(false) }: { abierto?: boolean; asignadas: Etiqueta[]; disponibles: Etiqueta[]; tarea: { titulo: string; descripcion: string | null; prioridad: string | null; fechaLimite: Date | string; actualizadoEn: Date | string } } = $props();
  const opciones = $derived([...asignadas, ...disponibles.filter((et) => !asignadas.some((a) => a.id === et.id))]);
  let fecha = $state(''), fechaInicial = $state('');
  onMount(() => { const d = new Date(tarea.fechaLimite); fecha = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); fechaInicial = fecha; });
  const guardarEdicion: SubmitFunction = ({ formData }) => {
    const fechaLocal = String(formData.get('fechaLimiteLocal') ?? '');
    const elegida = fechaLocal === fechaInicial ? new Date(tarea.fechaLimite) : new Date(fechaLocal);
    formData.set('fechaLimite', Number.isFinite(elegida.getTime()) ? elegida.toISOString() : '');
    return async ({ update }) => {
      await update({ reset: false });
    };
  };
  const campo = 'mt-1 w-full rounded-lg border border-tezcat-border bg-tezcat-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tezcat-cyan';
</script>
<details bind:open={abierto} class="rounded-xl border border-tezcat-border bg-tezcat-card p-5">
  <summary class="cursor-pointer font-semibold text-tezcat-cyan">Editar datos de la tarea</summary>
  <p class="mt-3 text-sm text-tezcat-textSecondary">Puedes corregir los datos mientras la tarea esté asignada o en proceso. Indica el motivo para que el equipo pueda consultarlo en el historial.</p>
  <form method="POST" action="?/editar" use:enhance={guardarEdicion} class="mt-4 grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="version" value={new Date(tarea.actualizadoEn).toISOString()} />
    <label class="sm:col-span-2">Título<input class={campo} name="titulo" value={tarea.titulo} maxlength="200" required /></label>
    <label class="sm:col-span-2">Descripción<textarea class={campo} name="descripcion" maxlength="5000" rows="3">{tarea.descripcion ?? ''}</textarea></label>
    <label>Prioridad<select class={campo} name="prioridad" value={tarea.prioridad ?? 'MEDIA'}>{#each ['BAJA','MEDIA','ALTA','URGENTE'] as p}<option value={p}>{p}</option>{/each}</select></label>
    <label>Fecha límite (hora de tu equipo)<input class={campo} type="datetime-local" name="fechaLimiteLocal" bind:value={fecha} required /></label>
    <fieldset class="sm:col-span-2">
      <legend class="font-semibold">Etiquetas</legend>
      <input type="hidden" name="editarEtiquetas" value="1" />
      <div class="mt-2 flex flex-wrap gap-3">
        {#each opciones as et (et.id)}
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="etiquetas" value={et.id} checked={asignadas.some((a) => a.id === et.id)} />
            {et.nombre}{et.activo ? '' : ' (inactiva)'}
          </label>
        {:else}
          <p class="text-sm text-tezcat-textSecondary">No hay etiquetas disponibles en este departamento.</p>
        {/each}
      </div>
    </fieldset>
    <label class="sm:col-span-2">Motivo del cambio<textarea class={campo} name="motivo" maxlength="1000" required rows="2"></textarea></label>
    <button class="justify-self-start rounded-lg border border-tezcat-cyan/40 bg-tezcat-cyan/10 px-4 py-2.5 text-sm font-semibold text-tezcat-cyan" type="submit">Guardar cambios</button>
  </form>
</details>
