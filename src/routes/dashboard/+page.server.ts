import { redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { movimientosXp, proyectos, tareas, usuarios } from '$lib/server/db/schema';

type Prioridad = 'critica' | 'progreso' | 'cola';
type Tono = 'normal' | 'cian' | 'alerta';

// ── Helpers de formato (ver TODOs: reglas de negocio de primera versión) ──

function codigoTarea(numero: number | null): string {
  return numero ? `CORE-${numero}` : 'CORE-?';
}

function formatearVence(fecha: Date | null): string {
  if (!fecha) return 'Sin fecha límite';
  const ahora = new Date();
  const diffHoras = (fecha.getTime() - ahora.getTime()) / 1000 / 60 / 60;
  if (diffHoras < 0) return 'Vencida';
  if (fecha.toDateString() === ahora.toDateString()) {
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    return `Vence hoy ${hh}:${mm}`;
  }
  if (diffHoras <= 48) return `Vence en ${Math.round(diffHoras)}h`;
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mo = String(fecha.getMonth() + 1).padStart(2, '0');
  return `Vence el ${dd}/${mo}`;
}

function formatearEstimado(minutos: number | null): string {
  if (!minutos) return 'Sin estimar';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}m`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}m`;
}

// TODO(equipo): confirmar la fórmula real de nivel/XP, esta es de arranque.
function calcularNivel(xpTotal: number) {
  const nivel = Math.floor(xpTotal / 500) + 1;
  return { nivel, xpMeta: nivel * 500, nivelSiguiente: nivel + 1 };
}

function calcularRango(nivel: number): string {
  if (nivel >= 10) return 'Tier V · Rango Maestro';
  if (nivel >= 7) return 'Tier IV · Rango Senior';
  if (nivel >= 4) return 'Tier III · Rango Avanzado';
  if (nivel >= 2) return 'Tier II · Rango Intermedio';
  return 'Tier I · Rango Novato';
}

function calcularRacha(dias: string[]): number {
  if (dias.length === 0) return 0;
  const diasSet = new Set(dias);
  const aISO = (d: Date) => d.toISOString().slice(0, 10);
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!diasSet.has(aISO(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let racha = 0;
  while (diasSet.has(aISO(cursor))) {
    racha++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return racha;
}

// ── Carga de datos reales para reemplazar el demo ──

async function cargarDashboard(usuarioId: string, departamentoId: string | null) {
  const [xpFila] = await db
    .select({ total: sql<number>`coalesce(sum(${movimientosXp.cantidad}), 0)::int` })
    .from(movimientosXp)
    .where(eq(movimientosXp.usuarioId, usuarioId));
  const xpTotal = xpFila.total;
  const { nivel, xpMeta, nivelSiguiente } = calcularNivel(xpTotal);

  const diasConMovimiento = await db
    .selectDistinct({ dia: sql<string>`to_char(${movimientosXp.creadoEn}, 'YYYY-MM-DD')` })
    .from(movimientosXp)
    .where(eq(movimientosXp.usuarioId, usuarioId));
  const racha = calcularRacha(diasConMovimiento.map((f) => f.dia));

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date(hoyInicio);
  hoyFin.setDate(hoyFin.getDate() + 1);

  const tareasHoy = await db
    .select({ estado: tareas.estado })
    .from(tareas)
    .where(and(
      eq(tareas.responsableId, usuarioId),
      eq(tareas.tipo, 'OBLIGATORIA'),
      gte(tareas.fechaLimite, hoyInicio),
      lt(tareas.fechaLimite, hoyFin)
    ));
  const cuota = {
    hechas: tareasHoy.filter((t) => t.estado === 'TERMINADA').length,
    total: tareasHoy.length
  };

  const perfil = {
    rango: calcularRango(nivel),
    racha,
    cuota,
    xp: xpTotal,
    xpMeta,
    nivelSiguiente
  };

  const [asignadas] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas)
    .where(eq(tareas.responsableId, usuarioId));
  const [altaPrioridad] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas)
    .where(and(eq(tareas.responsableId, usuarioId), eq(tareas.prioridad, 'critica')));
  const [enProceso] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas)
    .where(and(eq(tareas.responsableId, usuarioId), eq(tareas.estado, 'EN_PROCESO')));
  const [proximaEnProceso] = await db.select({ titulo: tareas.titulo, fechaLimite: tareas.fechaLimite })
    .from(tareas)
    .where(and(eq(tareas.responsableId, usuarioId), eq(tareas.estado, 'EN_PROCESO')))
    .orderBy(asc(tareas.fechaLimite))
    .limit(1);
  const [completadas] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas)
    .where(and(eq(tareas.responsableId, usuarioId), eq(tareas.estado, 'TERMINADA')));
  const [prioritarias] = await db.select({ total: sql<number>`count(*)::int` }).from(tareas)
    .where(and(
      eq(tareas.responsableId, usuarioId),
      eq(tareas.prioridad, 'critica'),
      ne(tareas.estado, 'TERMINADA')
    ));
  const proyectosActivos = await db.selectDistinct({ id: proyectos.id }).from(tareas)
    .innerJoin(proyectos, eq(tareas.proyectoId, proyectos.id))
    .where(and(
      eq(tareas.responsableId, usuarioId),
      eq(proyectos.activo, true),
      ne(tareas.estado, 'TERMINADA')
    ));

  const kpis: {
    titulo: string; valor: string; icono: string; pie: string;
    tono: Tono; pieIcono?: string; etiqueta?: string; insignia?: string;
  }[] = [
    { titulo: 'Tareas asignadas', valor: String(asignadas.total).padStart(2, '0'), icono: 'assignment',
      pie: `${altaPrioridad.total} de alta prioridad`, tono: 'normal' },
    { titulo: 'En progreso', valor: String(enProceso.total).padStart(2, '0'), icono: 'sync',
      pie: proximaEnProceso ? `${proximaEnProceso.titulo}: ${formatearVence(proximaEnProceso.fechaLimite)}` : 'Sin tareas en progreso',
      pieIcono: 'timer', tono: 'cian' },
    { titulo: 'Completadas', valor: String(completadas.total).padStart(2, '0'), icono: 'star',
      insignia: `+${xpTotal} XP`, pie: 'Acumulado', tono: 'normal' },
    { titulo: 'Prioritarias', valor: String(prioritarias.total).padStart(2, '0'), icono: 'warning',
      etiqueta: 'Bloqueantes', pie: 'Crítico / urgente', tono: prioritarias.total > 0 ? 'alerta' : 'normal' },
    { titulo: 'Proyectos activos', valor: String(proyectosActivos.length).padStart(2, '0'), icono: 'hub',
      pie: 'En curso', pieIcono: 'flag', tono: 'normal' }
  ];

  const tareasPrioritarias = await db.select().from(tareas)
    .where(and(eq(tareas.responsableId, usuarioId), ne(tareas.estado, 'TERMINADA')))
    .orderBy(asc(tareas.fechaLimite))
    .limit(4);

  const tareasVista = tareasPrioritarias.map((t) => ({
    id: codigoTarea(t.numero),
    prioridad: (t.prioridad ?? 'cola') as Prioridad,
    vence: formatearVence(t.fechaLimite),
    titulo: t.titulo,
    detalle: t.descripcion ?? '',
    xp: t.xpOfrecido ?? 0,
    pts: t.puntosOfrecidos ?? 0,
    impacto: t.impacto ?? '—'
  }));

  const misionesDisponibles = await db.select().from(tareas)
    .where(and(
      eq(tareas.tipo, 'OPCIONAL'),
      sql`${tareas.responsableId} is null`,
      departamentoId ? eq(tareas.departamentoId, departamentoId) : sql`true`
    ))
    .orderBy(desc(tareas.creadoEn))
    .limit(3);

  const misionesVista = misionesDisponibles.map((t) => ({
    id: codigoTarea(t.numero),
    titulo: t.titulo,
    detalle: t.descripcion ?? '',
    pts: t.puntosOfrecidos ?? 0,
    xp: t.xpOfrecido ?? 0,
    estimado: formatearEstimado(t.estimadoMinutos)
  }));

  return { perfil, kpis, tareas: tareasVista, misiones: misionesVista };
}

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // El administrador tiene su propio panel en /admin
  if (user.rol === 'ADMIN') redirect(303, '/admin');

  const datosDashboard = await cargarDashboard(user.id, user.departamentoId ?? null);

  if (user.rol === 'ENCARGADO') {
    const [m] = user.departamentoId
      ? await db.select({ total: sql<number>`count(*)::int` }).from(usuarios)
          .where(and(eq(usuarios.departamentoId, user.departamentoId), eq(usuarios.activo, true)))
      : [{ total: 0 }];
    return { user, widgets: ['equipo', 'perfil'], metricas: { miembrosActivos: m.total }, ...datosDashboard };
  }
  return { user, widgets: ['perfil'], metricas: {}, ...datosDashboard };
};