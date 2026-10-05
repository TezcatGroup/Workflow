import { redirect } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';

type Prioridad = 'critica' | 'progreso' | 'cola';
type Tono = 'normal' | 'cian' | 'alerta';

// ── Datos de muestra ──────────────────────────────────────────────────────
// TODO(backend): todavía no hay tablas de tareas/XP. Cuando existan, reemplazar
// estas constantes por consultas dentro de `load` y devolver la MISMA forma:
// la página (+page.svelte) no necesita cambios.
const perfil = {
  rango: 'Tier IV · Rango Senior',
  racha: 18,
  cuota: { hechas: 3, total: 4 },
  xp: 2840,
  xpMeta: 3500,
  nivelSiguiente: 5
};

const kpis: {
  titulo: string; valor: string; icono: string; pie: string;
  tono: Tono; pieIcono?: string; etiqueta?: string; insignia?: string;
}[] = [
  { titulo: 'Tareas asignadas', valor: '08', icono: 'assignment', pie: '2 de alta prioridad', tono: 'normal' },
  { titulo: 'En progreso', valor: '03', icono: 'sync', pie: 'Consensus Node: 2h 15m', pieIcono: 'timer', tono: 'cian' },
  { titulo: 'Completadas', valor: '24', icono: 'star', insignia: '+1,850 XP', pie: '115% de cuota semanal', tono: 'normal' },
  { titulo: 'Prioritarias', valor: '02', icono: 'warning', etiqueta: 'Bloqueantes', pie: 'Crítico / urgente', tono: 'alerta' },
  { titulo: 'Proyectos activos', valor: '04', icono: 'hub', pie: '2 sprints en fase final', pieIcono: 'flag', tono: 'normal' }
];

const tareas: {
  id: string; prioridad: Prioridad; vence: string; titulo: string;
  detalle: string; xp: number; pts: number; impacto: string;
}[] = [
  {
    id: 'CORE-8941', prioridad: 'critica', vence: 'Vence en 2h',
    titulo: 'Despliegue de nuevo módulo de escalabilidad',
    detalle: 'Investigar, diseñar e implementar una nueva funcionalidad para Tezcat Workflow.',
    xp: 350, pts: 120, impacto: 'Infraestructura'
  },
  {
    id: 'OPS-4022', prioridad: 'critica', vence: 'Vence hoy 18:00',
    titulo: 'Resolver saturación de memoria',
    detalle: 'Investigar la causa raíz de la fuga de memoria en el módulo de "Asignación de Tareas".',
    xp: 280, pts: 90, impacto: 'DB Production'
  },
  {
    id: 'ARCH-1098', prioridad: 'progreso', vence: 'Sprint D+2',
    titulo: 'Migración de infraestructura a microservicios en la nube',
    detalle: 'Desacoplar el monolito actual de Tezcat Group hacia contenedores (Docker/Kubernetes) en AWS/Azure.',
    xp: 190, pts: 55, impacto: 'DB'
  },
  {
    id: 'SEC-209', prioridad: 'cola', vence: 'Sprint D+3',
    titulo: 'Auditoría de ciberseguridad y remediación de vulnerabilidades',
    detalle: 'Analizar el ecosistema digital de Tezcat Group e identificar brechas de seguridad.',
    xp: 150, pts: 40, impacto: 'Security'
  }
];

const misiones: {
  id: string; titulo: string; detalle: string; pts: number; xp: number; estimado: string;
}[] = [
  {
    id: 'revision-codigo', titulo: 'Revisión de código', pts: 220, xp: 180, estimado: '2h 30m',
    detalle: 'Revisar el código de un compañero en una actividad primaria y verificar que cumpla los estándares.'
  },
  {
    id: 'docs-apis', titulo: 'Actualización de documentación técnica de APIs', pts: 160, xp: 120, estimado: '1h 45m',
    detalle: 'Modificar los manuales de integración de Tezcat Workflow cuando se agrega o cambia un endpoint.'
  },
  {
    id: 'bugs', titulo: 'Gestión de incidencias y parches de bugs', pts: 300, xp: 240, estimado: '3h 15m',
    detalle: 'Atender errores menores de interfaz o lógica que afectan la experiencia pero no detienen la operación.'
  }
];

const demo = { perfil, kpis, tareas, misiones };

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  // El administrador tiene su propio panel en /admin
  if (user.rol === 'ADMIN') redirect(303, '/admin');

  if (user.rol === 'ENCARGADO') {
    const [m] = user.departamentoId
      ? await db.select({ total: sql<number>`count(*)::int` }).from(usuarios)
          .where(and(eq(usuarios.departamentoId, user.departamentoId), eq(usuarios.activo, true)))
      : [{ total: 0 }];
    return { user, widgets: ['equipo', 'perfil'], metricas: { miembrosActivos: m.total }, ...demo };
  }
  return { user, widgets: ['perfil'], metricas: {}, ...demo };
};