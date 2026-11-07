import { fail, type Actions } from '@sveltejs/kit';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  auditoriaUsuarios,
  canjes,
  movimientosPuntos,
  recompensas,
  usuarios
} from '$lib/server/db/schema';
import { campo, exigirAdmin } from '$lib/server/admin';

const ACCIONES_AUDITORIA_RECOMPENSAS = [
  'RECOMPENSA_CREADA',
  'RECOMPENSA_ACTUALIZADA',
  'RECOMPENSA_ACTIVADA',
  'RECOMPENSA_DESACTIVADA',
  'CANJE_ENTREGADO',
  'CANJE_CANCELADO'
];

export const load: PageServerLoad = async ({ locals }) => {
  const admin = exigirAdmin(locals.user);

  const [listaRecompensas, listaCanjes, bitacoraAuditoria] = await Promise.all([
    db.select().from(recompensas).orderBy(asc(recompensas.nombre)),
    db
      .select({
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
      .limit(50),
    db
      .select({
        id: auditoriaUsuarios.id,
        accion: auditoriaUsuarios.accion,
        detalle: auditoriaUsuarios.detalle,
        creadaEn: auditoriaUsuarios.creadaEn,
        actorNombre: usuarios.nombre
      })
      .from(auditoriaUsuarios)
      .leftJoin(usuarios, eq(auditoriaUsuarios.actorId, usuarios.id))
      .where(inArray(auditoriaUsuarios.accion, ACCIONES_AUDITORIA_RECOMPENSAS))
      .orderBy(desc(auditoriaUsuarios.creadaEn))
      .limit(25)
  ]);

  return {
    admin,
    recompensas: listaRecompensas,
    canjes: listaCanjes,
    auditoria: bitacoraAuditoria
  };
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const actions: Actions = {
  crear: async ({ locals, request }) => {
    const admin = exigirAdmin(locals.user);
    const form = await request.formData();
    const nombre = campo(form, 'nombre').trim();
    const descripcion = form.get('descripcion')?.toString().trim() || null;
    const costoPuntos = Number(campo(form, 'costoPuntos'));
    const stockStr = form.get('stock')?.toString().trim();
    const stock = stockStr ? Number(stockStr) : null;
    const imagenUrl = form.get('imagenUrl')?.toString().trim() || null;

    if (!nombre || nombre.length > 160) return fail(400, { error: 'Nombre inválido o muy largo.' });
    if (!Number.isInteger(costoPuntos) || costoPuntos <= 0) {
      return fail(400, { error: 'El costo en puntos debe ser un entero mayor a 0.' });
    }
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      return fail(400, { error: 'El stock no puede ser negativo.' });
    }

    try {
      await db.transaction(async (tx) => {
        const [creada] = await tx
          .insert(recompensas)
          .values({
            nombre,
            descripcion,
            costoPuntos,
            stock,
            imagenUrl,
            activo: true
          })
          .returning({ id: recompensas.id });

        // TW-21: Registrar auditoría administrativa de creación en el catálogo
        await tx.insert(auditoriaUsuarios).values({
          actorId: admin.id,
          accion: 'RECOMPENSA_CREADA',
          detalle: {
            recompensaId: creada.id,
            nombre,
            descripcion,
            costoPuntos,
            stock,
            imagenUrl,
            activo: true
          }
        });
      });

      return { ok: 'Recompensa creada, publicada y registrada en auditoría exitosamente.' };
    } catch {
      return fail(500, { error: 'Error al crear la recompensa en la base de datos.' });
    }
  },

  actualizar: async ({ locals, request }) => {
    const admin = exigirAdmin(locals.user);
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
    if (!Number.isInteger(costoPuntos) || costoPuntos <= 0) {
      return fail(400, { error: 'El costo en puntos debe ser un entero mayor a 0.' });
    }
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      return fail(400, { error: 'El stock no puede ser negativo.' });
    }

    try {
      await db.transaction(async (tx) => {
        const [antes] = await tx
          .select()
          .from(recompensas)
          .where(eq(recompensas.id, id))
          .limit(1);

        if (!antes) {
          throw new Error('La recompensa que intentas editar no existe.');
        }

        await tx
          .update(recompensas)
          .set({
            nombre,
            descripcion,
            costoPuntos,
            stock,
            imagenUrl,
            activo,
            actualizadaEn: new Date()
          })
          .where(eq(recompensas.id, id));

        const accionAuditoria =
          antes.activo !== activo
            ? activo
              ? 'RECOMPENSA_ACTIVADA'
              : 'RECOMPENSA_DESACTIVADA'
            : 'RECOMPENSA_ACTUALIZADA';

        // TW-21: Auditar los cambios administrativos realizados sobre la recompensa
        await tx.insert(auditoriaUsuarios).values({
          actorId: admin.id,
          accion: accionAuditoria,
          detalle: {
            recompensaId: id,
            nombre,
            antes: {
              nombre: antes.nombre,
              descripcion: antes.descripcion,
              costoPuntos: antes.costoPuntos,
              stock: antes.stock,
              imagenUrl: antes.imagenUrl,
              activo: antes.activo
            },
            despues: {
              nombre,
              descripcion,
              costoPuntos,
              stock,
              imagenUrl,
              activo
            }
          }
        });
      });

      return { ok: 'Recompensa actualizada y auditada correctamente.' };
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'Error al actualizar la recompensa.';
      return fail(400, { error: mensaje });
    }
  },

  resolverCanje: async ({ locals, request }) => {
    const admin = exigirAdmin(locals.user);
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
          await tx
            .update(canjes)
            .set({ estado: 'ENTREGADO', entregadoEn: new Date() })
            .where(eq(canjes.id, canjeId));

          await tx.insert(auditoriaUsuarios).values({
            actorId: admin.id,
            usuarioObjetivoId: canje.usuarioId,
            accion: 'CANJE_ENTREGADO',
            detalle: {
              canjeId: canje.id,
              recompensaId: canje.recompensaId,
              puntosGastados: canje.puntosGastados
            }
          });
        } else if (accion === 'CANCELAR') {
          await tx
            .update(canjes)
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
            const [rec] = await tx
              .select({ stock: recompensas.stock })
              .from(recompensas)
              .where(eq(recompensas.id, canje.recompensaId));
            if (rec && rec.stock !== null) {
              await tx
                .update(recompensas)
                .set({ stock: rec.stock + 1, actualizadaEn: new Date() })
                .where(eq(recompensas.id, canje.recompensaId));
            }
          }

          await tx.insert(auditoriaUsuarios).values({
            actorId: admin.id,
            usuarioObjetivoId: canje.usuarioId,
            accion: 'CANJE_CANCELADO',
            detalle: {
              canjeId: canje.id,
              recompensaId: canje.recompensaId,
              puntosReembolsados: canje.puntosGastados
            }
          });
        } else {
          throw new Error('Acción inválida.');
        }
      });

      return {
        ok:
          accion === 'ENTREGAR'
            ? 'El canje ha sido marcado como entregado y registrado en auditoría.'
            : 'Canje cancelado. Se han reembolsado los puntos y el stock.'
      };
    } catch (e: unknown) {
      const mensaje =
        e instanceof Error ? e.message : 'Error al procesar la resolución del canje.';
      return fail(400, { error: mensaje });
    }
  }
};
