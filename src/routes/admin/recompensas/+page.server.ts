import { fail, type Actions } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { recompensas, canjes, usuarios, movimientosPuntos } from '$lib/server/db/schema';
import { campo, exigirAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  exigirAdmin(locals.user);
  
  const [listaRecompensas, listaCanjes] = await Promise.all([
    db.select().from(recompensas).orderBy(asc(recompensas.nombre)),
    db.select({
      id: canjes.id,
      usuarioNombre: usuarios.nombre,
      recompensaNombre: recompensas.nombre,
      puntosGastados: canjes.puntosGastados,
      estado: canjes.estado,
      creadoEn: canjes.creadoEn,
      entregadoEn: canjes.entregadoEn
    })
    .from(canjes)
    .innerJoin(usuarios, eq(canjes.usuarioId, usuarios.id))
    .leftJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
    .orderBy(desc(canjes.creadoEn))
    .limit(50)
  ]);

  return { recompensas: listaRecompensas, canjes: listaCanjes };
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const actions: Actions = {
  crear: async ({ locals, request }) => {
    exigirAdmin(locals.user);
    const form = await request.formData();
    const nombre = campo(form, 'nombre').trim();
    const descripcion = form.get('descripcion')?.toString().trim() || null;
    const costoPuntos = Number(campo(form, 'costoPuntos'));
    const stockStr = form.get('stock')?.toString().trim();
    const stock = stockStr ? Number(stockStr) : null;
    const imagenUrl = form.get('imagenUrl')?.toString().trim() || null;

    if (!nombre || nombre.length > 160) return fail(400, { error: 'Nombre inválido o muy largo.' });
    if (costoPuntos <= 0) return fail(400, { error: 'El costo en puntos debe ser mayor a 0.' });
    if (stock !== null && stock < 0) return fail(400, { error: 'El stock no puede ser negativo.' });

    try {
      await db.insert(recompensas).values({ 
        nombre, descripcion, costoPuntos, stock, imagenUrl, activo: true 
      });
      return { ok: 'Recompensa creada y publicada exitosamente.' };
    } catch (e) {
      return fail(500, { error: 'Error al crear la recompensa en la base de datos.' });
    }
  },

  actualizar: async ({ locals, request }) => {
    exigirAdmin(locals.user);
    const form = await request.formData();
    const id = campo(form, 'id');
    const nombre = campo(form, 'nombre').trim();
    const descripcion = form.get('descripcion')?.toString().trim() || null;
    const costoPuntos = Number(campo(form, 'costoPuntos'));
    const stockStr = form.get('stock')?.toString().trim();
    const stock = stockStr ? Number(stockStr) : null;
    const imagenUrl = form.get('imagenUrl')?.toString().trim() || null;
    const activo = campo(form, 'activo') === 'true';

    if (!uuid.test(id)) return fail(400, { error: 'Identificador inválido.' });
    if (!nombre || nombre.length > 160) return fail(400, { error: 'Nombre inválido o muy largo.' });
    if (costoPuntos <= 0) return fail(400, { error: 'El costo en puntos debe ser mayor a 0.' });
    if (stock !== null && stock < 0) return fail(400, { error: 'El stock no puede ser negativo.' });

    try {
      await db.update(recompensas).set({
        nombre, descripcion, costoPuntos, stock, imagenUrl, activo, actualizadaEn: new Date()
      }).where(eq(recompensas.id, id));
      return { ok: 'Recompensa actualizada correctamente.' };
    } catch (e) {
      return fail(500, { error: 'Error al actualizar la recompensa.' });
    }
  },

  resolverCanje: async ({ locals, request }) => {
    exigirAdmin(locals.user);
    const form = await request.formData();
    const canjeId = campo(form, 'canjeId');
    const accion = campo(form, 'accion'); // 'ENTREGAR' o 'CANCELAR'

    if (!uuid.test(canjeId)) return fail(400, { error: 'ID de canje inválido.' });

    try {
      await db.transaction(async (tx) => {
        const [canje] = await tx.select().from(canjes).where(eq(canjes.id, canjeId)).limit(1);
        if (!canje) throw new Error('Canje no encontrado en la base de datos.');
        if (canje.estado !== 'PENDIENTE') throw new Error('Este canje ya fue resuelto previamente.');

        if (accion === 'ENTREGAR') {
          await tx.update(canjes)
            .set({ estado: 'ENTREGADO', entregadoEn: new Date() })
            .where(eq(canjes.id, canjeId));
        } else if (accion === 'CANCELAR') {
          await tx.update(canjes)
            .set({ estado: 'CANCELADO' })
            .where(eq(canjes.id, canjeId));
            
          // Reembolsar los puntos gastados al usuario
          await tx.insert(movimientosPuntos).values({
            usuarioId: canje.usuarioId,
            cantidad: canje.puntosGastados,
            motivo: 'Reembolso por canje cancelado'
          });

          // Devolver el stock a la tienda si la recompensa maneja inventario finito
          if (canje.recompensaId) {
            const [rec] = await tx.select({ stock: recompensas.stock }).from(recompensas).where(eq(recompensas.id, canje.recompensaId));
            if (rec && rec.stock !== null) {
              await tx.update(recompensas)
                .set({ stock: rec.stock + 1 })
                .where(eq(recompensas.id, canje.recompensaId));
            }
          }
        } else {
          throw new Error('Acción inválida.');
        }
      });

      return { 
        ok: accion === 'ENTREGAR' 
          ? 'El canje ha sido marcado como entregado.' 
          : 'Canje cancelado. Se han reembolsado los puntos y el stock.' 
      };
    } catch (e: any) {
      return fail(400, { error: e.message || 'Error al procesar la resolución del canje.' });
    }
  }
};