import { error } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditoriaUsuarios, canjes, movimientosPuntos, recompensas, usuarios } from '$lib/server/db/schema';
import { insertarNotificacionesBD } from '$lib/server/notificaciones';
import type { Actor } from '$lib/server/tareas';

export async function solicitarCanje(actor: Actor, recompensaId: string, origen: 'tienda' | 'perfil') {
  return db.transaction(async (tx) => {
    // Serializa los descuentos por cuenta y permite las referencias a esa cuenta en avisos concurrentes.
    const [solicitante] = await tx.select({
      id: usuarios.id, nombre: usuarios.nombre, departamentoId: usuarios.departamentoId
    }).from(usuarios).where(and(eq(usuarios.id, actor.id), eq(usuarios.activo, true))).for('no key update');
    if (!solicitante) error(403, 'La cuenta no está disponible para canjear recompensas');

    const [rec] = await tx.select().from(recompensas)
      .where(and(eq(recompensas.id, recompensaId), eq(recompensas.activo, true))).for('update');
    if (!rec) throw new Error('La recompensa ya no está disponible en el catálogo.');
    if (rec.stock !== null && rec.stock <= 0) throw new Error(`La recompensa "${rec.nombre}" se encuentra agotada.`);

    const [saldo] = await tx.select({ total: sql<number>`coalesce(sum(${movimientosPuntos.cantidad}), 0)::int` })
      .from(movimientosPuntos).where(eq(movimientosPuntos.usuarioId, solicitante.id));
    if (saldo.total < rec.costoPuntos) {
      throw new Error(`Saldo insuficiente. Tienes ${saldo.total} monedas y "${rec.nombre}" cuesta ${rec.costoPuntos} monedas.`);
    }

    if (rec.stock !== null) {
      await tx.update(recompensas).set({ stock: rec.stock - 1, actualizadaEn: new Date() }).where(eq(recompensas.id, rec.id));
    }

    const [canje] = await tx.insert(canjes).values({
      usuarioId: solicitante.id, recompensaId: rec.id, puntosGastados: rec.costoPuntos, estado: 'PENDIENTE'
    }).returning({ id: canjes.id });

    await tx.insert(movimientosPuntos).values({
      usuarioId: solicitante.id,
      cantidad: -rec.costoPuntos,
      motivo: `${origen === 'tienda' ? 'Canje en tienda' : 'Canje de recompensa'}: ${rec.nombre}`
    });

    const folio = canje.id.slice(0, 8).toUpperCase();
    if (solicitante.departamentoId) {
      const encargados = await tx.select({ id: usuarios.id }).from(usuarios)
        .where(and(eq(usuarios.departamentoId, solicitante.departamentoId), eq(usuarios.rol, 'ENCARGADO'), eq(usuarios.activo, true)));
      await insertarNotificacionesBD(tx, encargados.map(({ id }) => ({
        usuarioId: id,
        titulo: `Canje pendiente #${folio}: ${rec.nombre}`,
        mensaje: `${solicitante.nombre} solicitó la recompensa "${rec.nombre}" por ${rec.costoPuntos} monedas.`,
        enlace: '/tienda#canjes-area'
      })));
    }
    return { folio, nombre: rec.nombre, costo: rec.costoPuntos, saldoRestante: saldo.total - rec.costoPuntos };
  });
}

export async function pagarCanje(actor: Actor, canjeId: string) {
  const esAdmin = actor.rol === 'ADMIN';
  if (!esAdmin && (actor.rol !== 'ENCARGADO' || !actor.departamentoId)) {
    error(403, 'Solo un encargado de área o administrador puede marcar canjes como pagados');
  }
  await db.transaction(async (tx) => {
    const [canje] = await tx.select({
      id: canjes.id, estado: canjes.estado, usuarioId: canjes.usuarioId,
      recompensaId: canjes.recompensaId, puntosGastados: canjes.puntosGastados
    }).from(canjes).innerJoin(usuarios, eq(canjes.usuarioId, usuarios.id))
      .where(and(eq(canjes.id, canjeId), esAdmin ? undefined : eq(usuarios.departamentoId, actor.departamentoId!)))
      .for('update', { of: canjes });
    if (!canje) error(404, 'Canje no encontrado');
    if (canje.estado !== 'PENDIENTE') error(400, 'Este canje ya fue resuelto previamente.');

    await tx.update(canjes).set({ estado: 'ENTREGADO', entregadoEn: new Date() }).where(eq(canjes.id, canje.id));
    await tx.insert(auditoriaUsuarios).values({
      actorId: actor.id,
      usuarioObjetivoId: canje.usuarioId,
      accion: 'CANJE_ENTREGADO',
      detalle: { canjeId: canje.id, recompensaId: canje.recompensaId, puntosGastados: canje.puntosGastados }
    });
  });
}
