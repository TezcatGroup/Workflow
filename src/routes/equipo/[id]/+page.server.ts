import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { obtenerIntegranteEquipo } from '$lib/server/equipo';
import { cargarPerfil } from '$lib/server/perfil-datos';

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) redirect(303, '/login');
  const { foto, departamentoId, ...integrante } = await obtenerIntegranteEquipo(locals.user, params.id);
  const { progresoNivel, habilidades, especialidades, insignias, contribucionesOpcionales, totalContribuciones } =
    await cargarPerfil({ id: integrante.id, departamentoId }, locals.user.departamentoId!);

  return {
    user: locals.user,
    integrante: { ...integrante, tieneFoto: Boolean(foto) },
    progreso: {
      expTotal: progresoNivel.expTotal,
      nivel: progresoNivel.nivel,
      porcentajeNivel: progresoNivel.porcentajeNivel,
      expRestanteParaSubir: progresoNivel.expRestanteParaSubir
    },
    habilidades,
    especialidades,
    insignias: insignias.filter((i) => i.desbloqueada).map(({ id, titulo, descripcion, icono }) => ({ id, titulo, descripcion, icono })),
    contribuciones: contribucionesOpcionales.map(({ id, titulo, fechaAprobacion, proyectoNombre, etiquetas }) => ({
      id, titulo, fechaAprobacion, proyectoNombre, etiquetas
    })),
    totalContribuciones
  };
};
