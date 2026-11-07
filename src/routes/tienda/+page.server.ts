import { fail, redirect, type Actions } from '@sveltejs/kit';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  canjes,
  movimientosPuntos,
  movimientosXp,
  recompensas
} from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';

const XP_POR_NIVEL = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // El administrador gestiona el catálogo desde /admin/recompensas
  if (user.rol === 'ADMIN') redirect(303, '/admin/recompensas');

  const [[monedas], [exp], listaRecompensas, historialCanjes] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${movimientosPuntos.cantidad}), 0)::int` })
      .from(movimientosPuntos)
      .where(eq(movimientosPuntos.usuarioId, user.id)),
    db
      .select({ total: sql<number>`coalesce(sum(${movimientosXp.cantidad}), 0)::int` })
      .from(movimientosXp)
      .where(eq(movimientosXp.usuarioId, user.id)),
    db
      .select()
      .from(recompensas)
      .where(eq(recompensas.activo, true))
      .orderBy(asc(recompensas.costoPuntos), asc(recompensas.nombre)),
    db
      .select({
        id: canjes.id,
        recompensaId: canjes.recompensaId,
        recompensaNombre: recompensas.nombre,
        puntosGastados: canjes.puntosGastados,
        estado: canjes.estado,
        creadoEn: canjes.creadoEn,
        entregadoEn: canjes.entregadoEn
      })
      .from(canjes)
      .leftJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
      .where(eq(canjes.usuarioId, user.id))
      .orderBy(desc(canjes.creadoEn))
      .limit(30)
  ]);

  const saldo = monedas?.total ?? 0;
  const expTotal = Math.max(0, exp?.total ?? 0);
  const nivel = Math.floor(expTotal / XP_POR_NIVEL) + 1;

  const totalCanjeadoHistorico = historialCanjes
    .filter((c) => c.estado !== 'CANCELADO')
    .reduce((acc, c) => acc + c.puntosGastados, 0);

  return {
    user,
    saldo,
    expTotal,
    nivel,
    recompensas: listaRecompensas,
    canjes: historialCanjes,
    totalCanjeadoHistorico
  };
};

export const actions: Actions = {
  canjear: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');
    if (user.rol === 'ADMIN') {
      return fail(403, { error: 'El administrador únicamente administra el catálogo.' });
    }

    const form = await request.formData();
    const recompensaId = campo(form, 'recompensaId');

    if (!UUID.test(recompensaId)) {
      return fail(400, { error: 'Identificador de recompensa inválido.' });
    }

    try {
      const resultado = await db.transaction(async (tx) => {
        // 1. Verificar recompensa activa y bloquear fila para evitar condición de carrera en stock
        const [rec] = await tx
          .select()
          .from(recompensas)
          .where(and(eq(recompensas.id, recompensaId), eq(recompensas.activo, true)))
          .for('update');

        if (!rec) {
          throw new Error('Esta recompensa ya no se encuentra activa en la tienda.');
        }

        if (rec.stock !== null && rec.stock <= 0) {
          throw new Error(`El artículo "${rec.nombre}" se ha agotado.`);
        }

        // 2. Verificar saldo real disponible en movimientos_puntos
        const [saldoBD] = await tx
          .select({ total: sql<number>`coalesce(sum(${movimientosPuntos.cantidad}), 0)::int` })
          .from(movimientosPuntos)
          .where(eq(movimientosPuntos.usuarioId, user.id));

        const saldoActual = saldoBD?.total ?? 0;
        if (saldoActual < rec.costoPuntos) {
          throw new Error(
            `Saldo insuficiente. Tienes ${saldoActual} monedas y "${rec.nombre}" requiere ${rec.costoPuntos} monedas.`
          );
        }

        // 3. Reducir en 1 el stock si maneja inventario limitado
        if (rec.stock !== null) {
          await tx
            .update(recompensas)
            .set({ stock: rec.stock - 1, actualizadaEn: new Date() })
            .where(eq(recompensas.id, rec.id));
        }

        // 4. Registrar el canje en estado PENDIENTE para que el Admin lo gestione en /admin/recompensas
        await tx.insert(canjes).values({
          usuarioId: user.id,
          recompensaId: rec.id,
          puntosGastados: rec.costoPuntos,
          estado: 'PENDIENTE'
        });

        // 5. Descontar las monedas del saldo general del usuario
        await tx.insert(movimientosPuntos).values({
          usuarioId: user.id,
          tareaId: null,
          cantidad: -rec.costoPuntos,
          motivo: `Canje en tienda: ${rec.nombre}`
        });

        return { nombre: rec.nombre, costo: rec.costoPuntos };
      });

      return {
        ok: `Solicitud tramitada: "${resultado.nombre}" por ${resultado.costo} monedas. Pendiente de entrega.`
      };
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al procesar el canje.';
      return fail(400, { error: mensaje });
    }
  }
};