import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { departamentos } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  let departamento: string | null = null;
  if (user.departamentoId) {
    const [dep] = await db
      .select({ nombre: departamentos.nombre })
      .from(departamentos)
      .where(eq(departamentos.id, user.departamentoId));
    departamento = dep?.nombre ?? null;
  }

  return { user, departamento };
};