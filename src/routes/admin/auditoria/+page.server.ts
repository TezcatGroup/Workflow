import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { exigirAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { auditoriaUsuarios } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  return { eventos: await db.select().from(auditoriaUsuarios)
    .orderBy(desc(auditoriaUsuarios.creadaEn)).limit(100) };
};
