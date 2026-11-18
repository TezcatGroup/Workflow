<script lang="ts">
  let { detalle }: { detalle: unknown } = $props();
  const etiquetas: Record<string,string> = { nombre:'Nombre', descripcion:'Descripción', titulo:'Título', prioridad:'Prioridad', fechaLimite:'Fecha límite', activo:'Activo', rol:'Rol', email:'Correo', departamentoId:'Departamento', motivo:'Motivo', sesionesRevocadas:'Sesiones cerradas', costoPuntos:'Costo en monedas', stock:'Existencias', estado:'Estado', id:'Identificador', usuarioEliminado:'Cuenta eliminada', actorEliminado:'Autor eliminado' };
  function valor(v: unknown): string {
    if (v === null || v === undefined || v === '') return 'Sin valor';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${etiquetas[k] ?? k}: ${valor(x)}`).join(' · ');
    return String(v);
  }
  const datos = $derived((detalle && typeof detalle === 'object' ? detalle : {}) as Record<string, unknown>);
  const antes = $derived((datos.antes ?? {}) as Record<string,unknown>);
  const despues = $derived((datos.despues ?? {}) as Record<string,unknown>);
  const claves = $derived([...new Set([...Object.keys(antes), ...Object.keys(despues)])]);
</script>
{#if claves.length}
  <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-tezcat-border text-tezcat-textSecondary"><th class="p-2">Campo</th><th class="p-2">Antes</th><th class="p-2">Después</th></tr></thead><tbody>{#each claves as k}<tr class="border-b border-tezcat-border/50"><th class="p-2 font-medium">{etiquetas[k] ?? k}</th><td class="max-w-xs whitespace-pre-wrap break-words p-2 text-tezcat-textSecondary">{valor(antes[k])}</td><td class="max-w-xs whitespace-pre-wrap break-words p-2">{valor(despues[k])}</td></tr>{/each}</tbody></table></div>
{/if}
<dl class="space-y-2 text-sm">{#each Object.entries(datos).filter(([k]) => k !== 'antes' && k !== 'despues') as [k,v]}<div><dt class="text-tezcat-textSecondary">{etiquetas[k] ?? k}</dt><dd class="whitespace-pre-wrap break-words">{valor(v)}</dd></div>{/each}</dl>
{#if !Object.keys(datos).length}<p class="text-sm text-tezcat-textSecondary">Sin detalles adicionales.</p>{/if}
