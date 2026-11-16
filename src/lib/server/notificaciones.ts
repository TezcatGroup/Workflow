import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  notificaciones,
  proyectos,
  recompensas,
  tareaDelegaciones,
  tareaMensajes,
  tareas,
  usuarios
} from '$lib/server/db/schema';
import type { Actor } from '$lib/server/tareas';

const MS_POR_HORA = 3_600_000;
const VENTANA_POR_VENCER_MS = 48 * MS_POR_HORA; // 48 horas antes del vencimiento
const COOLDOWN_SCHEDULER_MS = 2 * 60_000; // Ejecución máxima cada 2 minutos bajo demanda
const INTERVALO_WORKER_MS = 10 * 60_000; // Revisión automática cada 10 minutos

let ultimaEjecucionScheduler = 0;
let workerIniciado = false;

export type DatosNuevaNotificacion = {
  usuarioId: string;
  tareaId?: string | null;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
};

/**
 * Reemplaza cualquier referencia interna "CORE-123" en títulos antiguos por el título real de la tarea.
 */
function limpiarTextoCore(tituloNotificacion: string, tareaTitulo?: string | null): string {
  if (!/CORE-\d+|CORE-\?/i.test(tituloNotificacion)) {
    return tituloNotificacion;
  }
  if (tareaTitulo) {
    return tituloNotificacion
      .replace(/·\s*CORE-(\d+|\?)/gi, `: ${tareaTitulo}`)
      .replace(/en\s+CORE-(\d+|\?)/gi, `en "${tareaTitulo}"`)
      .replace(/CORE-(\d+|\?)/gi, tareaTitulo);
  }
  return tituloNotificacion
    .replace(/·\s*CORE-(\d+|\?)/gi, '')
    .replace(/CORE-(\d+|\?)/gi, '')
    .trim();
}

/**
 * TW-23: Inserta una notificación interna mostrando siempre el nombre de la actividad.
 */
export async function crearNotificacionBD(datos: DatosNuevaNotificacion): Promise<void> {
  try {
    await db.insert(notificaciones).values({
      usuarioId: datos.usuarioId,
      tareaId: datos.tareaId ?? null,
      titulo: datos.titulo.slice(0, 200),
      mensaje: datos.mensaje,
      enlace: datos.enlace ?? (datos.tareaId ? `/tareas/${datos.tareaId}` : '/tareas'),
      leida: false
    });
  } catch (err) {
    console.error('[TW-23] Error al registrar notificación:', err);
  }
}

/**
 * TW-24: Proceso desatendido (Scheduler) que detecta tareas asignadas o tomadas del muro
 * que están próximas a vencer (<= 48h) o ya vencieron, usando el nombre de la tarea.
 */
export async function verificarVencimientosTareasBD(forzar = false): Promise<number> {
  const ahoraMs = Date.now();
  if (!forzar && ahoraMs - ultimaEjecucionScheduler < COOLDOWN_SCHEDULER_MS) {
    return 0;
  }
  ultimaEjecucionScheduler = ahoraMs;

  try {
    const limiteProximo = new Date(ahoraMs + VENTANA_POR_VENCER_MS);
    const hace24Horas = new Date(ahoraMs - 24 * MS_POR_HORA);

    const tareasCriticas = await db
      .select({
        id: tareas.id,
        titulo: tareas.titulo,
        tipo: tareas.tipo,
        fechaLimite: tareas.fechaLimite,
        responsableId: tareas.responsableId,
        revisorId: tareas.revisorId
      })
      .from(tareas)
      .where(
        and(
          inArray(tareas.estado, ['ASIGNADA', 'EN_PROCESO']),
          isNotNull(tareas.responsableId),
          lte(tareas.fechaLimite, limiteProximo)
        )
      )
      .limit(100);

    if (tareasCriticas.length === 0) return 0;

    const idsTareas = tareasCriticas.map((t) => t.id);

    const alertasRecientes = await db
      .select({
        tareaId: notificaciones.tareaId,
        usuarioId: notificaciones.usuarioId,
        titulo: notificaciones.titulo
      })
      .from(notificaciones)
      .where(
        and(
          inArray(notificaciones.tareaId, idsTareas),
          gte(notificaciones.creadaEn, hace24Horas)
        )
      );

    const clavesEnviadas = new Set(
      alertasRecientes.map((a) => `${a.tareaId}:${a.usuarioId}:${a.titulo}`)
    );

    let generadas = 0;

    for (const t of tareasCriticas) {
      if (!t.responsableId) continue;

      const diffMs = new Date(t.fechaLimite).getTime() - ahoraMs;
      const horasRestantes = Math.ceil(diffMs / MS_POR_HORA);
      const etiquetaTipo = t.tipo === 'OPCIONAL' ? 'opcional tomada' : 'asignada';
      const nombreCorto = t.titulo.length > 55 ? `${t.titulo.slice(0, 55)}…` : t.titulo;

      if (diffMs < 0) {
        const diasVencida = Math.max(1, Math.ceil(Math.abs(diffMs) / (24 * MS_POR_HORA)));
        const tituloMiembro = `⚠️ Tarea vencida: ${nombreCorto}`;
        const claveMiembro = `${t.id}:${t.responsableId}:${tituloMiembro}`;

        if (!clavesEnviadas.has(claveMiembro)) {
          await crearNotificacionBD({
            usuarioId: t.responsableId,
            tareaId: t.id,
            titulo: tituloMiembro,
            mensaje: `Tu actividad ${etiquetaTipo} "${t.titulo}" venció hace ${diasVencida} día${diasVencida === 1 ? '' : 's'}.`,
            enlace: `/tareas/${t.id}`
          });
          clavesEnviadas.add(claveMiembro);
          generadas++;
        }

        if (t.revisorId && t.revisorId !== t.responsableId) {
          const tituloRevisor = `⚠️ Vencimiento en equipo: ${nombreCorto}`;
          const claveRevisor = `${t.id}:${t.revisorId}:${tituloRevisor}`;
          if (!clavesEnviadas.has(claveRevisor)) {
            await crearNotificacionBD({
              usuarioId: t.revisorId,
              tareaId: t.id,
              titulo: tituloRevisor,
              mensaje: `La tarea "${t.titulo}" presenta fecha límite vencida sin concluir.`,
              enlace: `/tareas/${t.id}`
            });
            clavesEnviadas.add(claveRevisor);
            generadas++;
          }
        }
      } else {
        const tituloPorVencer = `⏰ Tarea por vencer: ${nombreCorto}`;
        const clavePorVencer = `${t.id}:${t.responsableId}:${tituloPorVencer}`;

        if (!clavesEnviadas.has(clavePorVencer)) {
          const textoTiempo =
            horasRestantes <= 24
              ? `vence en menos de ${Math.max(1, horasRestantes)} h`
              : `vence en ${Math.ceil(horasRestantes / 24)} días`;

          await crearNotificacionBD({
            usuarioId: t.responsableId,
            tareaId: t.id,
            titulo: tituloPorVencer,
            mensaje: `Recuerda terminar tu actividad ${etiquetaTipo} "${t.titulo}" (${textoTiempo}).`,
            enlace: `/tareas/${t.id}`
          });
          clavesEnviadas.add(clavePorVencer);
          generadas++;
        }
      }
    }

    return generadas;
  } catch (err) {
    console.error('[TW-24] Error verificando vencimientos:', err);
    return 0;
  }
}

/**
 * TW-24: Inicia el worker temporal en segundo plano una sola vez por proceso de servidor.
 */
export function asegurarSchedulerActivo(): void {
  if (!workerIniciado) {
    workerIniciado = true;
    const timer = setInterval(() => {
      verificarVencimientosTareasBD().catch((err) =>
        console.error('[TW-24 Scheduler] Error en ciclo automático:', err)
      );
    }, INTERVALO_WORKER_MS);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  verificarVencimientosTareasBD().catch(() => {});
}

/**
 * TW-23: Obtiene las últimas notificaciones del usuario (mostrando el nombre de la tarea en vez de CORE).
 */
export async function listarNotificacionesUsuarioBD(usuarioId: string, limite = 25) {
  asegurarSchedulerActivo();

  const [items, conteo] = await Promise.all([
    db
      .select({
        id: notificaciones.id,
        tareaId: notificaciones.tareaId,
        titulo: notificaciones.titulo,
        mensaje: notificaciones.mensaje,
        enlace: notificaciones.enlace,
        leida: notificaciones.leida,
        creadaEn: notificaciones.creadaEn,
        tareaTitulo: tareas.titulo,
        tareaEstado: tareas.estado
      })
      .from(notificaciones)
      .leftJoin(tareas, eq(notificaciones.tareaId, tareas.id))
      .where(eq(notificaciones.usuarioId, usuarioId))
      .orderBy(desc(notificaciones.creadaEn))
      .limit(limite),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificaciones)
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, false)))
  ]);

  const notificacionesLimpias = items.map((n) => ({
    ...n,
    titulo: limpiarTextoCore(n.titulo, n.tareaTitulo)
  }));

  return {
    noLeidas: conteo[0]?.total ?? 0,
    notificaciones: notificacionesLimpias
  };
}

/**
 * TW-23: Marca una notificación específica como leída.
 */
export async function marcarNotificacionLeidaBD(
  usuarioId: string,
  notificacionId: string
): Promise<void> {
  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.id, notificacionId), eq(notificaciones.usuarioId, usuarioId)));
}

/**
 * TW-23: Marca todas las notificaciones pendientes del usuario como leídas.
 */
export async function marcarTodasLeidasBD(usuarioId: string): Promise<void> {
  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, false)));
}

/**
 * TW-23 y TW-25: Carga los datos para la ventana /notificaciones:
 * - Tareas terminadas y Tareas por vencer (con el rol y nombre del miembro responsable)
 * - Mensajería de las tareas
 * - Objetos agregados en la tienda
 * - Últimas notificaciones del usuario
 */
export async function obtenerDatosCentroNotificacionesBD(actor: Actor) {
  let idsDelegadasAceptadas: string[] = [];
  if (actor.rol === 'MIEMBRO') {
    const delegadas = await db
      .select({ tareaId: tareaDelegaciones.tareaId })
      .from(tareaDelegaciones)
      .where(
        and(eq(tareaDelegaciones.solicitanteId, actor.id), eq(tareaDelegaciones.estado, 'ACEPTADA'))
      );
    idsDelegadasAceptadas = delegadas.map((d) => d.tareaId);
  }

  const condicionPermiso =
    actor.rol === 'ADMIN'
      ? undefined
      : actor.rol === 'ENCARGADO' && actor.departamentoId
        ? eq(tareas.departamentoId, actor.departamentoId)
        : or(
            eq(tareas.responsableId, actor.id),
            eq(tareas.creadoPorId, actor.id),
            eq(tareas.revisorId, actor.id),
            actor.departamentoId
              ? and(
                  eq(tareas.departamentoId, actor.departamentoId),
                  eq(tareas.tipo, 'OPCIONAL'),
                  isNull(tareas.responsableId)
                )
              : undefined,
            idsDelegadasAceptadas.length > 0 ? inArray(tareas.id, idsDelegadasAceptadas) : undefined
          );

  const tareasVisibles = await db
    .select({
      id: tareas.id,
      numero: tareas.numero,
      titulo: tareas.titulo,
      descripcion: tareas.descripcion,
      tipo: tareas.tipo,
      estado: tareas.estado,
      prioridad: tareas.prioridad,
      dificultad: tareas.dificultad,
      fechaLimite: tareas.fechaLimite,
      creadoEn: tareas.creadoEn,
      actualizadoEn: tareas.actualizadoEn,
      xpOfrecido: tareas.xpOfrecido,
      puntosOfrecidos: tareas.puntosOfrecidos,
      responsableId: tareas.responsableId,
      responsableNombre: usuarios.nombre,
      responsableRol: usuarios.rol,
      proyectoNombre: proyectos.nombre
    })
    .from(tareas)
    .leftJoin(usuarios, eq(tareas.responsableId, usuarios.id))
    .leftJoin(proyectos, eq(tareas.proyectoId, proyectos.id))
    .where(condicionPermiso)
    .orderBy(desc(tareas.actualizadoEn))
    .limit(200);

  const mapaTareas = new Map(tareasVisibles.map((t) => [t.id, t]));
  const idsTareas = tareasVisibles.map((t) => t.id);

  const [mensajesBD, objetosTiendaBD, avisosUsuario] = await Promise.all([
    idsTareas.length > 0
      ? db
          .select({
            id: tareaMensajes.id,
            tareaId: tareaMensajes.tareaId,
            contenido: tareaMensajes.contenido,
            creadoEn: tareaMensajes.creadoEn,
            autorNombre: usuarios.nombre,
            autorRol: usuarios.rol
          })
          .from(tareaMensajes)
          .leftJoin(usuarios, eq(tareaMensajes.autorId, usuarios.id))
          .where(inArray(tareaMensajes.tareaId, idsTareas))
          .orderBy(desc(tareaMensajes.creadoEn))
          .limit(100)
      : Promise.resolve([]),
    db
      .select({
        id: recompensas.id,
        nombre: recompensas.nombre,
        descripcion: recompensas.descripcion,
        costoPuntos: recompensas.costoPuntos,
        stock: recompensas.stock,
        imagenUrl: recompensas.imagenUrl,
        activo: recompensas.activo,
        creadaEn: recompensas.creadaEn
      })
      .from(recompensas)
      .where(eq(recompensas.activo, true))
      .orderBy(desc(recompensas.creadaEn))
      .limit(100),
    listarNotificacionesUsuarioBD(actor.id, 60)
  ]);

  const historialMensajeria = mensajesBD.map((m) => {
    const infoTarea = mapaTareas.get(m.tareaId);
    return {
      id: m.id,
      tareaId: m.tareaId,
      contenido: m.contenido,
      creadoEn: m.creadoEn,
      autorNombre: m.autorNombre ?? 'Usuario',
      autorRol: m.autorRol ?? 'MIEMBRO',
      tareaTitulo: infoTarea?.titulo ?? 'Actividad',
      tareaEstado: infoTarea?.estado ?? 'ASIGNADA',
      responsableNombre: infoTarea?.responsableNombre ?? 'Sin asignar'
    };
  });

  return {
    tareas: tareasVisibles,
    historialMensajeria,
    objetosTienda: objetosTiendaBD,
    notificaciones: avisosUsuario.notificaciones,
    noLeidas: avisosUsuario.noLeidas
  };
}