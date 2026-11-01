import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// TW-13: por ahora el Muro solo necesita el usuario para el encabezado y los
// botones por rol. TODO (contrato Sprint 7): el backend reemplazará este load
// por la carga real de tareas opcionales publicadas y sus etiquetas.
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  return { user: locals.user };
};