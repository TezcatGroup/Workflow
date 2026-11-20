import { fail, isHttpError, redirect, type Actions } from '@sveltejs/kit';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  canjes,
  movimientosPuntos,
  movimientosXp,
  recompensas,
  usuarios
} from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';
import { pagarCanje, solicitarCanje } from '$lib/server/canjes';

const XP_POR_NIVEL = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // El administrador gestiona el catálogo desde /admin/recompensas
  if (user.rol === 'ADMIN') redirect(303, '/admin/recompensas');

  const [[monedas], [exp], listaRecompensas, historialCanjes, movimientosMonedas, canjesArea] =
    await Promise.all([
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
        .limit(30),
      db
        .select({
          id: movimientosPuntos.id,
          tareaId: movimientosPuntos.tareaId,
          cantidad: movimientosPuntos.cantidad,
          motivo: movimientosPuntos.motivo,
          creadoEn: movimientosPuntos.creadoEn
        })
        .from(movimientosPuntos)
        .where(eq(movimientosPuntos.usuarioId, user.id))
        .orderBy(desc(movimientosPuntos.creadoEn))
        .limit(30),
      user.rol === 'ENCARGADO' && user.departamentoId
        ? db.select({
          id: canjes.id, usuarioNombre: usuarios.nombre, recompensaNombre: recompensas.nombre,
          puntosGastados: canjes.puntosGastados, creadoEn: canjes.creadoEn
        }).from(canjes)
          .innerJoin(usuarios, eq(canjes.usuarioId, usuarios.id))
          .leftJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
          .where(and(eq(usuarios.departamentoId, user.departamentoId), eq(canjes.estado, 'PENDIENTE')))
          .orderBy(asc(canjes.creadoEn))
        : Promise.resolve([])
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
    canjesArea,
    movimientos: movimientosMonedas,
    totalCanjeadoHistorico
  };
};

export const actions: Actions = {
  // TW-17 y TW-22: Canje transaccional con verificación de stock/saldo, registro permanente y descuento único
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
      const resultado = await solicitarCanje(user, recompensaId, 'tienda');

      return {
        ok: `¡Canje confirmado (#${resultado.folio})! Solicitaste "${resultado.nombre}" por ${resultado.costo} monedas. Queda pendiente de pago. Saldo restante: ${resultado.saldoRestante} monedas.`
      };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      const mensaje = e instanceof Error ? e.message : 'Error al procesar el canje.';
      return fail(400, { error: mensaje });
    }
  },
  pagarCanje: async ({ locals, request }) => {
    if (!locals.user) redirect(303, '/login');
    const canjeId = campo(await request.formData(), 'canjeId');
    if (!UUID.test(canjeId)) return fail(400, { error: 'ID de canje inválido.' });
    try {
      await pagarCanje(locals.user, canjeId);
      return { ok: 'Canje marcado como pagado.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  }
};
