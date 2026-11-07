import { fail, redirect, type Actions } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
  canjes,
  departamentos,
  etiquetas,
  movimientosPuntos,
  movimientosRama,
  movimientosXp,
  proyectos,
  ramas,
  recompensas,
  tareaEtiquetas,
  tareas
} from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';

const XP_POR_NIVEL = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const [
    [exp],
    [monedas],
    historialXp,
    puntosPorRamaBD,
    etiquetasPorTareasTerminadas,
    catalogoEtiquetasDepto,
    recompensasDisponibles,
    misCanjes,
    historialPuntos,
    tareasOpcionalesTerminadasBD
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${movimientosXp.cantidad}), 0)` })
      .from(movimientosXp)
      .where(eq(movimientosXp.usuarioId, user.id)),
    db
      .select({ total: sql<string>`coalesce(sum(${movimientosPuntos.cantidad}), 0)` })
      .from(movimientosPuntos)
      .where(eq(movimientosPuntos.usuarioId, user.id)),
    db
      .select({
        id: movimientosXp.id,
        tareaId: movimientosXp.tareaId,
        cantidad: movimientosXp.cantidad,
        motivo: movimientosXp.motivo,
        creadoEn: movimientosXp.creadoEn
      })
      .from(movimientosXp)
      .where(eq(movimientosXp.usuarioId, user.id))
      .orderBy(desc(movimientosXp.creadoEn))
      .limit(20),
    db
      .select({
        nombre: ramas.nombre,
        categoria: ramas.descripcion,
        puntos: sql<number>`coalesce(sum(${movimientosRama.puntos}), 0)::int`
      })
      .from(movimientosRama)
      .innerJoin(ramas, eq(ramas.id, movimientosRama.ramaId))
      .where(eq(movimientosRama.usuarioId, user.id))
      .groupBy(ramas.id, ramas.nombre, ramas.descripcion),
    db
      .select({
        nombre: etiquetas.nombre,
        categoria: etiquetas.categoria,
        puntos: sql<number>`count(*)::int`
      })
      .from(tareas)
      .innerJoin(tareaEtiquetas, eq(tareaEtiquetas.tareaId, tareas.id))
      .innerJoin(etiquetas, eq(etiquetas.id, tareaEtiquetas.etiquetaId))
      .where(
        and(
          eq(tareas.responsableId, user.id),
          eq(tareas.tipo, 'OPCIONAL'),
          eq(tareas.estado, 'TERMINADA')
        )
      )
      .groupBy(etiquetas.id, etiquetas.nombre, etiquetas.categoria),
    user.departamentoId
      ? db
          .select({
            id: etiquetas.id,
            nombre: etiquetas.nombre,
            categoria: etiquetas.categoria
          })
          .from(etiquetas)
          .where(and(eq(etiquetas.departamentoId, user.departamentoId), eq(etiquetas.activo, true)))
          .orderBy(asc(etiquetas.nombre))
      : Promise.resolve([]),
    // TW-17 / TW-22: Catálogo de recompensas activas para canjear monedas
    db
      .select()
      .from(recompensas)
      .where(eq(recompensas.activo, true))
      .orderBy(asc(recompensas.costoPuntos), asc(recompensas.nombre)),
    // TW-17 / TW-22: Historial de canjes solicitados por el usuario
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
      .limit(20),
    // TW-17 / TW-19: Movimientos de monedas (ganadas en tareas opcionales y gastadas en canjes)
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
      .limit(20),
    // TW-19: Historial de contribuciones opcionales aprobadas del integrante
    db
      .select({
        id: tareas.id,
        numero: tareas.numero,
        titulo: tareas.titulo,
        dificultad: tareas.dificultad,
        xpOfrecido: tareas.xpOfrecido,
        puntosOfrecidos: tareas.puntosOfrecidos,
        proyectoNombre: proyectos.nombre,
        fechaAprobacion: tareas.actualizadoEn
      })
      .from(tareas)
      .leftJoin(proyectos, eq(tareas.proyectoId, proyectos.id))
      .where(
        and(
          eq(tareas.responsableId, user.id),
          eq(tareas.tipo, 'OPCIONAL'),
          eq(tareas.estado, 'TERMINADA')
        )
      )
      .orderBy(desc(tareas.actualizadoEn))
      .limit(20)
  ]);

  // Obtener etiquetas asociadas a cada contribución opcional aprobada
  const idsTareasOpcionales = tareasOpcionalesTerminadasBD.map((t) => t.id);
  const etiquetasDeContribuciones =
    idsTareasOpcionales.length > 0
      ? await db
          .select({
            tareaId: tareaEtiquetas.tareaId,
            nombre: etiquetas.nombre,
            categoria: etiquetas.categoria
          })
          .from(tareaEtiquetas)
          .innerJoin(etiquetas, eq(etiquetas.id, tareaEtiquetas.etiquetaId))
          .where(inArray(tareaEtiquetas.tareaId, idsTareasOpcionales))
      : [];

  const mapaEtiquetasPorTarea = new Map<
    string,
    { nombre: string; categoria: 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK' }[]
  >();
  for (const row of etiquetasDeContribuciones) {
    const lista = mapaEtiquetasPorTarea.get(row.tareaId) ?? [];
    lista.push({ nombre: row.nombre, categoria: row.categoria });
    mapaEtiquetasPorTarea.set(row.tareaId, lista);
  }

  const contribucionesOpcionales = tareasOpcionalesTerminadasBD.map((t) => ({
    ...t,
    etiquetas: mapaEtiquetasPorTarea.get(t.id) ?? []
  }));

  const expTotal = Math.max(0, Number(exp.total) || 0);
  const monedasTotal = Number(monedas.total) || 0;

  const nivel = Math.floor(expTotal / XP_POR_NIVEL) + 1;
  const expEnNivelActual = expTotal % XP_POR_NIVEL;
  const expRestanteParaSubir = XP_POR_NIVEL - expEnNivelActual;
  const porcentajeNivel = Math.min(100, Math.round((expEnNivelActual / XP_POR_NIVEL) * 100));

  const mapaHabilidades = new Map<
    string,
    { nombre: string; categoria: 'LENGUAJE DE PROGRAMACIÓN' | 'FRAMEWORK'; puntos: number }
  >();

  for (const et of catalogoEtiquetasDepto) {
    mapaHabilidades.set(et.nombre, { nombre: et.nombre, categoria: et.categoria, puntos: 0 });
  }
  for (const r of puntosPorRamaBD) {
    const cat =
      r.categoria === 'LENGUAJE DE PROGRAMACIÓN' ? 'LENGUAJE DE PROGRAMACIÓN' : 'FRAMEWORK';
    mapaHabilidades.set(r.nombre, {
      nombre: r.nombre,
      categoria: mapaHabilidades.get(r.nombre)?.categoria ?? cat,
      puntos: r.puntos
    });
  }
  for (const etTerm of etiquetasPorTareasTerminadas) {
    const actual = mapaHabilidades.get(etTerm.nombre);
    mapaHabilidades.set(etTerm.nombre, {
      nombre: etTerm.nombre,
      categoria: etTerm.categoria,
      puntos: Math.max(actual?.puntos ?? 0, etTerm.puntos)
    });
  }

  const habilidades = [...mapaHabilidades.values()].sort(
    (a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre)
  );

  // TW-19: Especialidades demostradas del integrante (ramas con experiencia > 0)
  const especialidades = habilidades
    .filter((h) => h.puntos > 0)
    .slice(0, 6)
    .map((h) => ({
      ...h,
      rango:
        h.puntos >= 5 ? 'Maestro' : h.puntos >= 3 ? 'Especialista' : 'Practicante'
    }));

  // TW-19: Insignias y logros calculados a partir de movimientos registrados
  const totalContribuciones = Math.max(contribucionesOpcionales.length, historialXp.length);
  const maxPuntosRama = habilidades.reduce((max, h) => Math.max(max, h.puntos), 0);
  const ramasLenguajeActivas = habilidades.filter(
    (h) => h.categoria === 'LENGUAJE DE PROGRAMACIÓN' && h.puntos > 0
  ).length;
  const ramasFrameworkActivas = habilidades.filter(
    (h) => h.categoria === 'FRAMEWORK' && h.puntos > 0
  ).length;
  const monedasGanadasHistoricas = historialPuntos
    .filter((m) => m.cantidad > 0)
    .reduce((acc, m) => acc + m.cantidad, 0);

  const insignias = [
    {
      id: 'pionero_muro',
      titulo: 'Pionero del Muro',
      descripcion: 'Completar y aprobar tu primera tarea opcional del Muro.',
      icono: 'military_tech',
      actual: Math.min(1, totalContribuciones),
      meta: 1,
      desbloqueada: totalContribuciones >= 1
    },
    {
      id: 'colaborador_constante',
      titulo: 'Colaborador Constante',
      descripcion: 'Aprobar 3 o más contribuciones opcionales en tu departamento.',
      icono: 'workspace_premium',
      actual: Math.min(3, totalContribuciones),
      meta: 3,
      desbloqueada: totalContribuciones >= 3
    },
    {
      id: 'ascenso_rango',
      titulo: 'Ascenso de Rango',
      descripcion: 'Acumular 1,000 EXP en movimientos para alcanzar el Nivel 2.',
      icono: 'bolt',
      actual: Math.min(1000, expTotal),
      meta: 1000,
      desbloqueada: expTotal >= 1000
    },
    {
      id: 'especialista_tecnico',
      titulo: 'Especialista Técnico',
      descripcion: 'Alcanzar Nivel 3 (3 pts) de dominio en una rama de habilidad.',
      icono: 'psychology',
      actual: Math.min(3, maxPuntosRama),
      meta: 3,
      desbloqueada: maxPuntosRama >= 3
    },
    {
      id: 'perfil_poliglota',
      titulo: 'Perfil Versátil',
      descripcion: 'Sumar experiencia tanto en Lenguajes de Programación como en Frameworks.',
      icono: 'hub',
      actual: (ramasLenguajeActivas > 0 ? 1 : 0) + (ramasFrameworkActivas > 0 ? 1 : 0),
      meta: 2,
      desbloqueada: ramasLenguajeActivas > 0 && ramasFrameworkActivas > 0
    },
    {
      id: 'gestor_recompensas',
      titulo: 'Ahorrador Tezcat',
      descripcion: 'Obtener 100 monedas por trabajo opcional o realizar tu primer canje.',
      icono: 'redeem',
      actual: misCanjes.length >= 1 ? 100 : Math.min(100, monedasGanadasHistoricas),
      meta: 100,
      desbloqueada: monedasGanadasHistoricas >= 100 || misCanjes.length >= 1
    }
  ];

  return {
    user,
    departamento,
    exp: String(exp.total),
    monedas: String(monedas.total),
    progresoNivel: {
      expTotal,
      monedasTotal,
      nivel,
      nivelSiguiente: nivel + 1,
      expEnNivelActual,
      expMetaNivel: XP_POR_NIVEL,
      expRestanteParaSubir,
      porcentajeNivel
    },
    habilidades,
    especialidades,
    insignias,
    contribucionesOpcionales,
    historialXp,
    recompensas: recompensasDisponibles,
    misCanjes,
    historialPuntos
  };
};

export const actions: Actions = {
  // TW-17 / TW-22: Acción transaccional para gastar puntos (monedas) en una recompensa del catálogo
  canjear: async ({ locals, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const recompensaId = campo(form, 'recompensaId');

    if (!UUID.test(recompensaId)) {
      return fail(400, { error: 'La recompensa seleccionada no es válida.' });
    }

    try {
      const nombreRecompensa = await db.transaction(async (tx) => {
        // 1. Bloquear la fila de la recompensa para evitar condiciones de carrera con el stock
        const [rec] = await tx
          .select()
          .from(recompensas)
          .where(and(eq(recompensas.id, recompensaId), eq(recompensas.activo, true)))
          .for('update');

        if (!rec) {
          throw new Error('La recompensa ya no está disponible en el catálogo.');
        }
        if (rec.stock !== null && rec.stock <= 0) {
          throw new Error(`La recompensa "${rec.nombre}" se encuentra agotada.`);
        }

        // 2. Consultar el saldo real de monedas del integrante dentro de la transacción
        const [saldoActual] = await tx
          .select({
            total: sql<number>`coalesce(sum(${movimientosPuntos.cantidad}), 0)::int`
          })
          .from(movimientosPuntos)
          .where(eq(movimientosPuntos.usuarioId, user.id));

        const disponibles = saldoActual?.total ?? 0;
        if (disponibles < rec.costoPuntos) {
          throw new Error(
            `Saldo insuficiente. Tienes ${disponibles} monedas y "${rec.nombre}" cuesta ${rec.costoPuntos} monedas.`
          );
        }

        // 3. Descontar 1 unidad del stock si la recompensa tiene inventario finito
        if (rec.stock !== null) {
          await tx
            .update(recompensas)
            .set({ stock: rec.stock - 1, actualizadaEn: new Date() })
            .where(eq(recompensas.id, rec.id));
        }

        // 4. Registrar la solicitud de canje en estado PENDIENTE
        await tx.insert(canjes).values({
          usuarioId: user.id,
          recompensaId: rec.id,
          puntosGastados: rec.costoPuntos,
          estado: 'PENDIENTE'
        });

        // 5. Descontar las monedas del saldo del integrante registrando el movimiento negativo
        await tx.insert(movimientosPuntos).values({
          usuarioId: user.id,
          tareaId: null,
          cantidad: -rec.costoPuntos,
          motivo: `Canje de recompensa: ${rec.nombre}`
        });

        return rec.nombre;
      });

      return {
        ok: `¡Canje exitoso! Solicitaste "${nombreRecompensa}". Queda pendiente de entrega por administración.`
      };
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No fue posible procesar el canje.';
      return fail(400, { error: mensaje });
    }
  }
};
