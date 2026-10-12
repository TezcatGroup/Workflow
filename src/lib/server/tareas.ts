import { error } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  estadoTarea, proyectos, tareaArchivos, tareaCriterios, tareaEventos, tareas, usuarios
} from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';

/* ------------------------------------------------------------------ */
/* Constantes (el frontend puede usarlas para armar selects)           */
/* ------------------------------------------------------------------ */

export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;
export const DIFICULTADES = ['FACIL', 'INTERMEDIA', 'DIFICIL', 'EXPERTO'] as const;

export const PRIORIDAD_POR_DEFECTO = 'MEDIA';
export const DIFICULTAD_POR_DEFECTO = 'INTERMEDIA';

const MAX_TITULO = 200;
const MAX_DESCRIPCION = 5000;
const MAX_CRITERIO = 255;
const MAX_CRITERIOS = 20;

/* ------------------------------------------------------------------ */
/* Tipos y permisos                                                    */
/* ------------------------------------------------------------------ */

export type Actor = NonNullable<App.Locals['user']>;
export type Encargado = Actor & { departamentoId: string };

/** Solo un ENCARGADO con departamento puede crear tareas (TW-04). */
export function exigirEncargado(user: App.Locals['user']): Encargado {
  if (!user || user.rol !== 'ENCARGADO') error(403, 'Solo un encargado puede crear tareas');
  if (!user.departamentoId) error(400, 'Tu cuenta no tiene departamento asignado');
  return { ...user, departamentoId: user.departamentoId };
}

/* ------------------------------------------------------------------ */
/* Validaciones                                                        */
/* ------------------------------------------------------------------ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(value: string): boolean {
  return UUID.test(value);
}

function validarTitulo(value: string): string {
  if (!value) error(400, 'El título es obligatorio');
  if (value.length > MAX_TITULO) error(400, `El título no puede superar ${MAX_TITULO} caracteres`);
  return value;
}

function validarDescripcion(value: string): string | null {
  if (!value) return null;
  if (value.length > MAX_DESCRIPCION) error(400, `La descripción no puede superar ${MAX_DESCRIPCION} caracteres`);
  return value;
}

/** Acepta 'YYYY-MM-DD' (se toma como fin de ese día) o 'YYYY-MM-DDTHH:mm'. Debe ser futura. */
function validarFechaLimite(value: string): Date {
  if (!value) error(400, 'La fecha límite es obligatoria');
  const texto = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59` : value;
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) error(400, 'La fecha límite es inválida');
  if (fecha.getTime() <= Date.now()) error(400, 'La fecha límite debe ser futura');
  return fecha;
}

function validarPrioridad(value: string): string {
  if (!value) return PRIORIDAD_POR_DEFECTO;
  const v = value.toUpperCase();
  if (!PRIORIDADES.some((p) => p === v)) error(400, 'Prioridad inválida');
  return v;
}

function validarDificultad(value: string): string {
  if (!value) return DIFICULTAD_POR_DEFECTO;
  const v = value.toUpperCase();
  if (!DIFICULTADES.some((d) => d === v)) error(400, 'Dificultad inválida');
  return v;
}

function validarCriterios(valores: FormDataEntryValue[]): string[] {
  const criterios = valores.map((v) => String(v).trim()).filter((v) => v.length > 0);
  if (criterios.length > MAX_CRITERIOS) error(400, `Máximo ${MAX_CRITERIOS} criterios por tarea`);
  if (criterios.some((c) => c.length > MAX_CRITERIO)) {
    error(400, `Cada criterio puede tener máximo ${MAX_CRITERIO} caracteres`);
  }
  return criterios;
}

/** Usuario activo del mismo departamento (ENCARGADO o MIEMBRO). */
async function validarUsuarioDelDepartamento(id: string, departamentoId: string, etiqueta: string) {
  if (!esUuid(id)) error(400, `${etiqueta} inválido`);
  const [u] = await db.select({ id: usuarios.id }).from(usuarios)
    .where(and(
      eq(usuarios.id, id),
      eq(usuarios.activo, true),
      eq(usuarios.departamentoId, departamentoId),
      inArray(usuarios.rol, ['ENCARGADO', 'MIEMBRO'])
    )).limit(1);
  if (!u) error(400, `${etiqueta} debe ser un usuario activo de tu departamento`);
  return u.id;
}

async function validarProyecto(id: string, departamentoId: string): Promise<string | null> {
  if (!id) return null;
  if (!esUuid(id)) error(400, 'Proyecto inválido');
  const [p] = await db.select({ id: proyectos.id }).from(proyectos)
    .where(and(
      eq(proyectos.id, id),
      eq(proyectos.activo, true),
      eq(proyectos.departamentoId, departamentoId)
    )).limit(1);
  if (!p) error(400, 'El proyecto debe estar activo y pertenecer a tu departamento');
  return p.id;
}

/* ------------------------------------------------------------------ */
/* Datos para el formulario de creación                                */
/* ------------------------------------------------------------------ */

export async function opcionesParaCrear(actor: Encargado) {
  const [responsables, proyectosActivos] = await Promise.all([
    db.select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol }).from(usuarios)
      .where(and(
        eq(usuarios.activo, true),
        eq(usuarios.departamentoId, actor.departamentoId),
        inArray(usuarios.rol, ['ENCARGADO', 'MIEMBRO'])
      )).orderBy(asc(usuarios.nombre)),
    db.select({ id: proyectos.id, nombre: proyectos.nombre }).from(proyectos)
      .where(and(eq(proyectos.activo, true), eq(proyectos.departamentoId, actor.departamentoId)))
      .orderBy(asc(proyectos.nombre))
  ]);
  return {
    responsables,
    proyectos: proyectosActivos,
    prioridades: [...PRIORIDADES],
    dificultades: [...DIFICULTADES],
    prioridadPorDefecto: PRIORIDAD_POR_DEFECTO,
    dificultadPorDefecto: DIFICULTAD_POR_DEFECTO
  };
}

/* ------------------------------------------------------------------ */
/* Creación de tareas obligatorias (TW-04)                             */
/* ------------------------------------------------------------------ */

/**
 * Campos del formulario: titulo, descripcion, responsableId, revisorId, fechaLimite,
 * prioridad, dificultad, proyectoId y criterios (campo repetido, uno por criterio).
 *
 * Todo lo que define una tarea OBLIGATORIA lo fija el servidor: tipo, estado inicial,
 * departamento, creador y la ausencia de XP/puntos. Nada de eso se toma del formulario.
 */
export async function crearTareaObligatoria(actor: Encargado, form: FormData) {
  const titulo = validarTitulo(campo(form, 'titulo'));
  const descripcion = validarDescripcion(campo(form, 'descripcion'));
  const fechaLimite = validarFechaLimite(campo(form, 'fechaLimite'));
  const prioridad = validarPrioridad(campo(form, 'prioridad'));
  const dificultad = validarDificultad(campo(form, 'dificultad'));
  const criterios = validarCriterios(form.getAll('criterios'));

  const responsableTxt = campo(form, 'responsableId');
  if (!responsableTxt) error(400, 'El responsable es obligatorio');
  const responsableId = await validarUsuarioDelDepartamento(responsableTxt, actor.departamentoId, 'El responsable');

  // Revisor opcional: si no se indica, revisa quien crea la tarea.
  const revisorTxt = campo(form, 'revisorId');
  let revisorId = actor.id;
  if (revisorTxt) {
    revisorId = await validarUsuarioDelDepartamento(revisorTxt, actor.departamentoId, 'El revisor');
    if (revisorId === responsableId) error(400, 'El revisor debe ser distinto del responsable');
  }

  const proyectoId = await validarProyecto(campo(form, 'proyectoId'), actor.departamentoId);

  return db.transaction(async (tx) => {
    const [tarea] = await tx.insert(tareas).values({
      titulo,
      descripcion,
      tipo: 'OBLIGATORIA',
      estado: 'ASIGNADA',
      prioridad,
      dificultad,
      proyectoId,
      departamentoId: actor.departamentoId,
      creadoPorId: actor.id,
      responsableId,
      revisorId,
      fechaLimite,
      xpOfrecido: null,
      puntosOfrecidos: null
    }).returning({ id: tareas.id, numero: tareas.numero });

    if (criterios.length > 0) {
      await tx.insert(tareaCriterios).values(
        criterios.map((descripcionCriterio) => ({ tareaId: tarea.id, descripcion: descripcionCriterio }))
      );
    }

    await tx.insert(tareaEventos).values({
      tareaId: tarea.id,
      actorId: actor.id,
      tipo: 'TAREA_CREADA',
      detalle: { responsableId, revisorId, fechaLimite: fechaLimite.toISOString(), criterios: criterios.length }
    });

    return tarea;
  });
}

/* ------------------------------------------------------------------ */
/* Estados y transiciones (TW-05)                                      */
/* ------------------------------------------------------------------ */

export type EstadoTarea = (typeof estadoTarea.enumValues)[number];

/**
 * Quién puede hacer cada transición.
 * - RESPONSABLE: el usuario al que se asignó la tarea.
 * - REVISOR: el revisor asignado o el encargado del departamento. Es una regla
 *   provisional: en el Sprint 6 (TW-12) la revisión formal reemplaza este paso.
 */
type Quien = 'RESPONSABLE' | 'REVISOR';

export const TRANSICIONES: Record<EstadoTarea, Partial<Record<EstadoTarea, Quien>>> = {
  ASIGNADA: { EN_PROCESO: 'RESPONSABLE' },
  EN_PROCESO: { EN_REVISION: 'RESPONSABLE' },
  EN_REVISION: { TERMINADA: 'REVISOR', EN_PROCESO: 'REVISOR' },
  TERMINADA: {}
};

type DatosPermiso = {
  creadoPorId: string | null;
  responsableId: string | null;
  revisorId: string | null;
  departamentoId: string | null;
};

function esEncargadoDelDepartamento(actor: Actor, t: DatosPermiso): boolean {
  return actor.rol === 'ENCARGADO' && actor.departamentoId !== null && actor.departamentoId === t.departamentoId;
}

/** Quién puede ver el detalle (TW-06): creador, responsable, revisor, encargado del depto y admin. */
function puedeVer(actor: Actor, t: DatosPermiso): boolean {
  if (actor.rol === 'ADMIN') return true;
  if (actor.id === t.creadoPorId || actor.id === t.responsableId || actor.id === t.revisorId) return true;
  return esEncargadoDelDepartamento(actor, t);
}

function cumpleRol(actor: Actor, quien: Quien, t: DatosPermiso): boolean {
  if (actor.rol === 'ADMIN') return false; // el admin solo consulta
  if (quien === 'RESPONSABLE') return actor.id === t.responsableId;
  return actor.id === t.revisorId || esEncargadoDelDepartamento(actor, t);
}

/** Estados a los que este usuario puede mover la tarea (sirve para mostrar u ocultar botones). */
function transicionesPermitidas(actor: Actor, estado: EstadoTarea, t: DatosPermiso): EstadoTarea[] {
  return (Object.entries(TRANSICIONES[estado]) as [EstadoTarea, Quien][])
    .filter(([, quien]) => cumpleRol(actor, quien, t))
    .map(([destino]) => destino);
}

async function cargarTarea(id: string) {
  if (!esUuid(id)) error(404, 'Tarea inexistente');
  const [tarea] = await db.select().from(tareas).where(eq(tareas.id, id)).limit(1);
  if (!tarea) error(404, 'Tarea inexistente');
  return tarea;
}

/**
 * Cambia el estado de una tarea. Valida en el servidor la transición y el permiso,
 * y registra el evento CAMBIO_ESTADO en la misma transacción.
 */
export async function cambiarEstado(actor: Actor, tareaId: string, destinoTxt: string) {
  const destino = estadoTarea.enumValues.find((e) => e === destinoTxt);
  if (!destino) error(400, 'Estado inválido');

  const tarea = await cargarTarea(tareaId);
  if (!puedeVer(actor, tarea)) error(403, 'No tienes acceso a esta tarea');

  const quien = TRANSICIONES[tarea.estado][destino];
  if (!quien) error(400, `No se puede pasar de ${tarea.estado} a ${destino}`);
  if (!cumpleRol(actor, quien, tarea)) error(403, 'No tienes permiso para este cambio de estado');

  await db.transaction(async (tx) => {
    // El WHERE incluye el estado leído: si otra persona la cambió antes, no se sobrescribe.
    const actualizadas = await tx.update(tareas)
      .set({ estado: destino, actualizadoEn: new Date() })
      .where(and(eq(tareas.id, tarea.id), eq(tareas.estado, tarea.estado)))
      .returning({ id: tareas.id });
    if (actualizadas.length === 0) error(409, 'La tarea cambió de estado mientras la editabas. Recarga la página');

    await tx.insert(tareaEventos).values({
      tareaId: tarea.id,
      actorId: actor.id,
      tipo: 'CAMBIO_ESTADO',
      detalle: { de: tarea.estado, a: destino }
    });
  });
  return { id: tarea.id, estado: destino };
}

/* ------------------------------------------------------------------ */
/* Detalle de una tarea (TW-06)                                        */
/* ------------------------------------------------------------------ */

export async function obtenerDetalle(actor: Actor, tareaId: string) {
  const tarea = await cargarTarea(tareaId);
  if (!puedeVer(actor, tarea)) error(403, 'No tienes acceso a esta tarea');

  const idsUsuarios = [tarea.creadoPorId, tarea.responsableId, tarea.revisorId]
    .filter((id): id is string => id !== null);

  const [personas, proyecto, criterios, archivos, eventos] = await Promise.all([
    idsUsuarios.length > 0
      ? db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios)
        .where(inArray(usuarios.id, idsUsuarios))
      : Promise.resolve([]),
    tarea.proyectoId
      ? db.select({ id: proyectos.id, nombre: proyectos.nombre }).from(proyectos)
        .where(eq(proyectos.id, tarea.proyectoId)).limit(1)
      : Promise.resolve([]),
    db.select({ id: tareaCriterios.id, descripcion: tareaCriterios.descripcion, completado: tareaCriterios.completado })
      .from(tareaCriterios).where(eq(tareaCriterios.tareaId, tarea.id)).orderBy(asc(tareaCriterios.creadoEn)),
    db.select({
      id: tareaArchivos.id, nombre: tareaArchivos.nombre,
      mimeType: tareaArchivos.mimeType, tamanoBytes: tareaArchivos.tamanoBytes
    }).from(tareaArchivos).where(eq(tareaArchivos.tareaId, tarea.id)).orderBy(asc(tareaArchivos.creadoEn)),
    db.select({
      id: tareaEventos.id, tipo: tareaEventos.tipo, detalle: tareaEventos.detalle,
      creadoEn: tareaEventos.creadoEn, actorNombre: usuarios.nombre
    }).from(tareaEventos).leftJoin(usuarios, eq(tareaEventos.actorId, usuarios.id))
      .where(eq(tareaEventos.tareaId, tarea.id)).orderBy(desc(tareaEventos.creadoEn))
  ]);

  const persona = (id: string | null) => personas.find((p) => p.id === id) ?? null;

  return {
    tarea: {
      id: tarea.id,
      numero: tarea.numero,
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      tipo: tarea.tipo,
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      dificultad: tarea.dificultad,
      fechaLimite: tarea.fechaLimite,
      creadoEn: tarea.creadoEn,
      actualizadoEn: tarea.actualizadoEn
    },
    creador: persona(tarea.creadoPorId),
    responsable: persona(tarea.responsableId),
    revisor: persona(tarea.revisorId),
    proyecto: proyecto[0] ?? null,
    criterios,
    archivos,
    eventos,
    // Estados a los que puede mover la tarea quien consulta (vacío = no mostrar botones).
    transicionesPermitidas: transicionesPermitidas(actor, tarea.estado, tarea)
  };
}

/* ------------------------------------------------------------------ */
/* Lista de tareas                                                     */
/* ------------------------------------------------------------------ */

/** MIEMBRO: sus tareas. ENCARGADO: las de su departamento. ADMIN: todas (solo lectura). */
export async function listarMisTareas(actor: Actor) {
  const filtro = actor.rol === 'ADMIN'
    ? undefined
    : actor.rol === 'ENCARGADO' && actor.departamentoId
      ? eq(tareas.departamentoId, actor.departamentoId)
      : eq(tareas.responsableId, actor.id);

  return db.select({
    id: tareas.id,
    numero: tareas.numero,
    titulo: tareas.titulo,
    estado: tareas.estado,
    prioridad: tareas.prioridad,
    dificultad: tareas.dificultad,
    fechaLimite: tareas.fechaLimite,
    responsableNombre: usuarios.nombre
  }).from(tareas)
    .leftJoin(usuarios, eq(tareas.responsableId, usuarios.id))
    .where(filtro)
    .orderBy(asc(tareas.fechaLimite))
    .limit(200);
}
