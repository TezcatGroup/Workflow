import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listarMisTareas } from '$lib/server/tareas';

/**
 * CONTRATO PARA EL FRONTEND
 *
 * data (load):
 *   user         { id, nombre, rol, departamentoId }
 *   puedeCrear   boolean  true si es ENCARGADO (mostrar botón hacia /tareas/nueva)
 *   tareas       [{ id, numero, titulo, estado, prioridad, dificultad, fechaLimite (Date),
 *                   responsableNombre }]  ordenadas por fecha límite (la más próxima primero)
 *
 * Qué ve cada rol:
 *   MIEMBRO    sus tareas asignadas
 *   ENCARGADO  las tareas de su departamento
 *   ADMIN      todas (solo lectura)
 *
 * Cada tarea enlaza a /tareas/<id>.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');
  return { user, puedeCrear: user.rol === 'ENCARGADO', tareas: await listarMisTareas(user) };
};
