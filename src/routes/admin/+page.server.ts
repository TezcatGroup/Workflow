import { desc, eq, gt, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, departamentos, sesiones, usuarios } from '$lib/server/db/schema';

// El acceso ADMIN ya lo exige admin/+layout.server.ts (y hooks.server.ts).
export const load: PageServerLoad = async () => {
  const n = sql<number>`count(*)::int`;

  const [[total], [activos], [areasActivas], [sesionesVivas], [eventos], recientes, areas] = await Promise.all([
    db.select({ n }).from(usuarios),
    db.select({ n }).from(usuarios).where(eq(usuarios.activo, true)),
    db.select({ n }).from(departamentos).where(eq(departamentos.activo, true)),
    db.select({ n }).from(sesiones).where(gt(sesiones.expiraEn, sql`now()`)),
    db.select({ n }).from(auditoriaUsuarios),
    // Últimos 7 usuarios con el nombre de su departamento
    db.select({
      id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email,
      rol: usuarios.rol, activo: usuarios.activo, departamento: departamentos.nombre
    })
      .from(usuarios)
      .leftJoin(departamentos, eq(usuarios.departamentoId, departamentos.id))
      .orderBy(desc(usuarios.creadoEn))
      .limit(7),
    // Departamentos activos con su número de integrantes activos
    db.select({
      id: departamentos.id, nombre: departamentos.nombre,
      integrantes: sql<number>`count(${usuarios.id}) filter (where ${usuarios.activo})::int`
    })
      .from(departamentos)
      .leftJoin(usuarios, eq(usuarios.departamentoId, departamentos.id))
      .where(eq(departamentos.activo, true))
      .groupBy(departamentos.id)
      .orderBy(departamentos.nombre)
  ]);

  return {
    resumen: {
      usuarios: total.n, activos: activos.n, departamentos: areasActivas.n,
      sesiones: sesionesVivas.n, auditoria: eventos.n
    },
    recientes,
    areas
  };
};