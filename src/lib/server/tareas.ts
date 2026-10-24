import { error } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  estadoTarea,
  proyectos,
  tareaArchivos,
  tareaCriterios,
  tareaDelegaciones,
  tareaEventos,
  tareas,
  usuarios,
  tareaMensajes
} from '$lib/server/db/schema';
import { campo } from '$lib/server/admin';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/* ------------------------------------------------------------------ */
/* Constantes (el frontend puede usarlas para armar selects)          */
/* ------------------------------------------------------------------ */

export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;
export const DIFICULTADES = ['FACIL', 'INTERMEDIA', 'DIFICIL', 'EXPERTO'] as const;

export const PRIORIDAD_POR_DEFECTO = 'MEDIA';
export const DIFICULTAD_POR_DEFECTO = 'INTERMEDIA';

export const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024; // 10 MB centralizado (TW-08)
const MAX_MENSAJE = 2000;
const MAX_MOTIVO_DELEGACION = 1000;

const MAX_TITULO = 200;
const MAX_DESCRIPCION = 5000;
const MAX_CRITERIO = 255;
const MAX_CRITERIOS = 20;

const MS_POR_DIA = 86_400_000;

/* ------------------------------------------------------------------ */
/* Tipos y permisos                                                   */
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
/* TW-10: Tipos y constructor del Timeline Unificado (Chat + Eventos) */
/* ------------------------------------------------------------------ */

export type ComentarioTarea = {
  id: string;
  tareaId: string;
  autorId: string;
  autorNombre: string;
  autorRol: string;
  contenido: string;
  creadoEn: Date;
};

export type EventoTarea = {
  id: string;
  tareaId: string;
  tipo: string;
  detalle: unknown;
  creadoEn: Date;
  actorNombre: string | null;
};

export type ItemTimeline =
  | ({ tipoItem: 'MENSAJE' } & ComentarioTarea)
  | ({ tipoItem: 'EVENTO' } & EventoTarea);

/**
 * TW-10: Fusiona los mensajes del chat y los eventos de auditoría de la tarea
 * en una sola secuencia cronológica ascendente para reconstruir lo ocurrido.
 */
export function construirTimeline(
  comentarios: ComentarioTarea[],
  eventos: EventoTarea[]
): ItemTimeline[] {
  const items: ItemTimeline[] = [
    ...eventos.map((e) => ({ tipoItem: 'EVENTO' as const, ...e })),
    ...comentarios.map((c) => ({ tipoItem: 'MENSAJE' as const, ...c }))
  ];

  return items.sort((a, b) => {
    // Garantizar que el evento fundacional TAREA_CREADA aparezca siempre al inicio
    if (a.tipoItem === 'EVENTO' && a.tipo === 'TAREA_CREADA') return -1;
    if (b.tipoItem === 'EVENTO' && b.tipo === 'TAREA_CREADA') return 1;
    return new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime();
  });
}

/* ------------------------------------------------------------------ */
/* TW-11: Cálculo de ventana del 20% en días enteros para delegar     */
/* ------------------------------------------------------------------ */

export function calcularPlazoReasignacion(creadoEn: Date, fechaLimite: Date) {
  const inicioMs = new Date(creadoEn).getTime();
  const finMs = new Date(fechaLimite).getTime();
  const diasTotales = Math.max(1, Math.ceil((finMs - inicioMs) / MS_POR_DIA));

  // 20% cerrado a número entero de días (mínimo 1 día)
  const diasPermitidos = Math.max(1, Math.round(diasTotales * 0.2));
  const fechaLimiteSolicitud = new Date(inicioMs + diasPermitidos * MS_POR_DIA);
  const ahora = Date.now();
  const dentroDePlazo = ahora <= fechaLimiteSolicitud.getTime();
  const diasRestantesSolicitud = Math.max(
    0,
    Math.ceil((fechaLimiteSolicitud.getTime() - ahora) / MS_POR_DIA)
  );

  return {
    diasTotales,
    diasPermitidos,
    fechaLimiteSolicitud,
    dentroDePlazo,
    diasRestantesSolicitud
  };
}

/* ------------------------------------------------------------------ */
/* Validaciones                                                       */
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

async function validarUsuarioDelDepartamento(
  id: string, departamentoId: string, etiqueta: string, soloEncargado = false
) {
  if (!esUuid(id)) error(400, `${etiqueta} inválido`);
  const roles: Array<'ENCARGADO' | 'MIEMBRO'> = soloEncargado ? ['ENCARGADO'] : ['ENCARGADO', 'MIEMBRO'];
  const [u] = await db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios)
    .where(and(
      eq(usuarios.id, id),
      eq(usuarios.activo, true),
      eq(usuarios.departamentoId, departamentoId),
      inArray(usuarios.rol, roles)
    )).limit(1);
  if (!u) {
    error(400, soloEncargado
      ? `${etiqueta} debe ser un encargado activo de tu departamento`
      : `${etiqueta} debe ser un usuario activo de tu departamento`);
  }
  return u;
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
/* Datos para el formulario de creación                               */
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
    revisores: responsables.filter((u) => u.rol === 'ENCARGADO'),
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

export async function crearTareaObligatoria(actor: Encargado, form: FormData) {
  const titulo = validarTitulo(campo(form, 'titulo'));
  const descripcion = validarDescripcion(campo(form, 'descripcion'));
  const fechaLimite = validarFechaLimite(campo(form, 'fechaLimite'));
  const prioridad = validarPrioridad(campo(form, 'prioridad'));
  const dificultad = validarDificultad(campo(form, 'dificultad'));
  const criterios = validarCriterios(form.getAll('criterios'));

  const responsableTxt = campo(form, 'responsableId');
  if (!responsableTxt) error(400, 'El responsable es obligatorio');
  const { id: responsableId } = await validarUsuarioDelDepartamento(responsableTxt, actor.departamentoId, 'El responsable');

  const revisorTxt = campo(form, 'revisorId');
  let revisorId = actor.id;
  if (revisorTxt) {
    revisorId = (await validarUsuarioDelDepartamento(revisorTxt, actor.departamentoId, 'El revisor', true)).id;
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
/* Estados, permisos y transiciones (TW-05, TW-07 y TW-11)             */
/* ------------------------------------------------------------------ */

export type EstadoTarea = (typeof estadoTarea.enumValues)[number];
type Quien = 'RESPONSABLE' | 'REVISOR';

export const TRANSICIONES: Record<EstadoTarea, Partial<Record<EstadoTarea, Quien>>> = {
  ASIGNADA: { EN_PROCESO: 'RESPONSABLE' },
  EN_PROCESO: { EN_REVISION: 'RESPONSABLE' },
  EN_REVISION: { TERMINADA: 'REVISOR', EN_PROCESO: 'REVISOR' },
  TERMINADA: {}
};

type DatosPermiso = {
  id?: string;
  creadoPorId: string | null;
  responsableId: string | null;
  revisorId: string | null;
  departamentoId: string | null;
};

function esEncargadoDelDepartamento(actor: Actor, t: DatosPermiso): boolean {
  return actor.rol === 'ENCARGADO' && actor.departamentoId !== null && actor.departamentoId === t.departamentoId;
}

export function puedeVer(actor: Actor, t: DatosPermiso): boolean {
  if (actor.rol === 'ADMIN') return true;
  if (actor.id === t.creadoPorId || actor.id === t.responsableId || actor.id === t.revisorId) return true;
  return esEncargadoDelDepartamento(actor, t);
}

/**
 * TW-11: Verifica si el usuario actual fue un miembro al que se le aprobó
 * la reasignación de esta tarea a otra persona (la ve como "Reasignada", pero sin permisos de edición).
 */
export async function fueReasignadaDelUsuario(usuarioId: string, tareaId: string, responsableActualId: string | null): Promise<boolean> {
  if (responsableActualId === usuarioId) return false;
  const [delegacion] = await db
    .select({ id: tareaDelegaciones.id })
    .from(tareaDelegaciones)
    .where(
      and(
        eq(tareaDelegaciones.tareaId, tareaId),
        eq(tareaDelegaciones.solicitanteId, usuarioId),
        eq(tareaDelegaciones.estado, 'ACEPTADA')
      )
    )
    .limit(1);
  return Boolean(delegacion);
}

export async function puedeVerConReasignacion(actor: Actor, t: DatosPermiso & { id: string }): Promise<{ acceso: boolean; esExResponsable: boolean }> {
  if (puedeVer(actor, t)) {
    return { acceso: true, esExResponsable: false };
  }
  const exResponsable = await fueReasignadaDelUsuario(actor.id, t.id, t.responsableId);
  return { acceso: exResponsable, esExResponsable: exResponsable };
}

function cumpleRol(actor: Actor, quien: Quien, t: DatosPermiso): boolean {
  if (actor.rol === 'ADMIN') return false;
  if (quien === 'RESPONSABLE') return actor.id === t.responsableId;
  return actor.id === t.revisorId || esEncargadoDelDepartamento(actor, t);
}

function transicionesPermitidas(actor: Actor, estado: EstadoTarea, t: DatosPermiso): EstadoTarea[] {
  return (Object.entries(TRANSICIONES[estado]) as [EstadoTarea, Quien][])
    .filter(([, quien]) => cumpleRol(actor, quien, t))
    .map(([destino]) => destino);
}

export async function cargarTarea(id: string) {
  if (!esUuid(id)) error(404, 'Tarea inexistente');
  const [tarea] = await db.select().from(tareas).where(eq(tareas.id, id)).limit(1);
  if (!tarea) error(404, 'Tarea inexistente');
  return tarea;
}

export async function cambiarEstado(actor: Actor, tareaId: string, destinoTxt: string) {
  const destino = estadoTarea.enumValues.find((e) => e === destinoTxt);
  if (!destino) error(400, 'Estado inválido');

  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');
  if (esExResponsable) error(403, 'Se ha validado la reasignación de esta actividad; ya no puedes modificarla.');

  const quien = TRANSICIONES[tarea.estado][destino];
  if (!quien) error(400, `No se puede pasar de ${tarea.estado} a ${destino}`);
  if (!cumpleRol(actor, quien, tarea)) error(403, 'No tienes permiso para este cambio de estado');

  // Candado de negocio TW-07: validar checklist antes de avanzar a EN_REVISION o TERMINADA
  if (destino === 'EN_REVISION' || destino === 'TERMINADA') {
    const criterios = await db
      .select({
        completado: tareaCriterios.completado,
        verificadoEncargado: tareaCriterios.verificadoEncargado
      })
      .from(tareaCriterios)
      .where(eq(tareaCriterios.tareaId, tarea.id));

    if (destino === 'EN_REVISION' && criterios.some((c) => !c.completado)) {
      error(400, 'Debes marcar todos los criterios de aceptación antes de enviar la tarea a revisión.');
    }
    if (destino === 'TERMINADA' && criterios.some((c) => !c.verificadoEncargado)) {
      error(400, 'Como encargado o revisor, debes verificar todos los criterios antes de aprobar la tarea.');
    }
  }

  await db.transaction(async (tx) => {
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
/* TW-11: Solicitud y Resolución de Reasignación Controlada           */
/* ------------------------------------------------------------------ */

export async function solicitarReasignacionBD(actor: Actor, tareaId: string, motivoTxt: string) {
  const tarea = await cargarTarea(tareaId);
  if (actor.id !== tarea.responsableId) {
    error(403, 'Solo el miembro actualmente responsable de la tarea puede solicitar su reasignación.');
  }
  if (tarea.estado !== 'ASIGNADA' && tarea.estado !== 'EN_PROCESO') {
    error(400, 'Solo puedes solicitar cambio de asignación cuando la tarea está Asignada o En proceso.');
  }

  const plazo = calcularPlazoReasignacion(tarea.creadoEn, tarea.fechaLimite);
  if (!plazo.dentroDePlazo) {
    error(
      400,
      `El plazo del 20% (${plazo.diasPermitidos} día${plazo.diasPermitidos === 1 ? '' : 's'}) para solicitar reasignación ya expiró.`
    );
  }

  const motivo = motivoTxt.trim();
  if (!motivo) error(400, 'Debes escribir el motivo por el cual solicitas el cambio de asignación.');
  if (motivo.length > MAX_MOTIVO_DELEGACION) {
    error(400, `El motivo no puede superar los ${MAX_MOTIVO_DELEGACION} caracteres.`);
  }

  // Verificar que no exista ya una solicitud pendiente para esta tarea
  const [pendiente] = await db
    .select({ id: tareaDelegaciones.id })
    .from(tareaDelegaciones)
    .where(and(eq(tareaDelegaciones.tareaId, tarea.id), eq(tareaDelegaciones.estado, 'PENDIENTE')))
    .limit(1);

  if (pendiente) {
    error(400, 'Ya existe una solicitud de reasignación pendiente de revisión por el encargado.');
  }

  await db.transaction(async (tx) => {
    await tx.insert(tareaDelegaciones).values({
      tareaId: tarea.id,
      solicitanteId: actor.id,
      destinatarioId: null,
      motivo,
      estado: 'PENDIENTE'
    });

    await tx.insert(tareaEventos).values({
      tareaId: tarea.id,
      actorId: actor.id,
      tipo: 'SOLICITUD_REASIGNACION',
      detalle: { motivo }
    });
  });
}

export async function resolverReasignacionBD(
  actor: Actor,
  tareaId: string,
  decision: 'APROBAR' | 'DECLINAR',
  nuevoResponsableTxt = '',
  motivoRechazoTxt = ''
) {
  const tarea = await cargarTarea(tareaId);
  if (!cumpleRol(actor, 'REVISOR', tarea)) {
    error(403, 'Solo el encargado puede aprobar o declinar solicitudes de reasignación.');
  }

  const [solicitud] = await db
    .select()
    .from(tareaDelegaciones)
    .where(and(eq(tareaDelegaciones.tareaId, tarea.id), eq(tareaDelegaciones.estado, 'PENDIENTE')))
    .orderBy(desc(tareaDelegaciones.creadaEn))
    .limit(1);

  if (!solicitud) {
    error(404, 'No hay ninguna solicitud de reasignación pendiente en esta tarea.');
  }

  if (decision === 'DECLINAR') {
    const motivoRechazo = motivoRechazoTxt.trim();
    if (!motivoRechazo) {
      error(400, 'Escribe el motivo por el cual se deniega el cambio para notificárselo al miembro en el chat.');
    }
    if (motivoRechazo.length > MAX_MOTIVO_DELEGACION) {
      error(400, `El motivo no puede superar los ${MAX_MOTIVO_DELEGACION} caracteres.`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(tareaDelegaciones)
        .set({
          estado: 'RECHAZADA',
          motivo: `${solicitud.motivo ?? ''} || RECHAZO_ENCARGADO: ${motivoRechazo}`,
          respondidaEn: new Date()
        })
        .where(eq(tareaDelegaciones.id, solicitud.id));

      // Enviar automáticamente al chat de la tarea el porqué no se pudo cambiar la asignación
      await tx.insert(tareaMensajes).values({
        tareaId: tarea.id,
        autorId: actor.id,
        contenido: `Se ha rechazado su solicitud: ${motivoRechazo}`
      });

      await tx.insert(tareaEventos).values({
        tareaId: tarea.id,
        actorId: actor.id,
        tipo: 'REASIGNACION_RECHAZADA',
        detalle: { motivoRechazo }
      });
    });

    return { estado: 'RECHAZADA' as const };
  }

  // Camino APROBAR: validar al nuevo trabajador y transferir la tarea
  if (!tarea.departamentoId) error(400, 'La tarea no tiene un departamento válido.');
  if (!nuevoResponsableTxt) error(400, 'Selecciona al trabajador al que se le reasignará la tarea.');

  const nuevoResponsable = await validarUsuarioDelDepartamento(
    nuevoResponsableTxt,
    tarea.departamentoId,
    'El nuevo trabajador'
  );

  if (nuevoResponsable.id === tarea.responsableId) {
    error(400, 'Debes elegir a un trabajador distinto al miembro que solicitó el cambio.');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tareaDelegaciones)
      .set({
        estado: 'ACEPTADA',
        destinatarioId: nuevoResponsable.id,
        respondidaEn: new Date()
      })
      .where(eq(tareaDelegaciones.id, solicitud.id));

    await tx
      .update(tareas)
      .set({
        responsableId: nuevoResponsable.id,
        actualizadoEn: new Date()
      })
      .where(eq(tareas.id, tarea.id));

    await tx.insert(tareaEventos).values({
      tareaId: tarea.id,
      actorId: actor.id,
      tipo: 'REASIGNACION_APROBADA',
      detalle: {
        anteriorResponsableId: tarea.responsableId,
        nuevoResponsableId: nuevoResponsable.id,
        nuevoResponsableNombre: nuevoResponsable.nombre
      }
    });
  });

  return { estado: 'ACEPTADA' as const, nuevoResponsableNombre: nuevoResponsable.nombre };
}

/* ------------------------------------------------------------------ */
/* Detalle de una tarea unificado (TW-06 a TW-11)                      */
/* ------------------------------------------------------------------ */

export async function obtenerDetalle(actor: Actor, tareaId: string) {
  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');

  const idsUsuarios = [tarea.creadoPorId, tarea.responsableId, tarea.revisorId]
    .filter((id): id is string => id !== null);

  const esJefe = cumpleRol(actor, 'REVISOR', tarea);

  const [personas, proyecto, criterios, archivosBD, eventos, comentarios, delegacionesBD, miembrosDepto] = await Promise.all([
    idsUsuarios.length > 0
      ? db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios)
        .where(inArray(usuarios.id, idsUsuarios))
      : Promise.resolve([]),
    tarea.proyectoId
      ? db.select({ id: proyectos.id, nombre: proyectos.nombre }).from(proyectos)
        .where(eq(proyectos.id, tarea.proyectoId)).limit(1)
      : Promise.resolve([]),
    db.select({
      id: tareaCriterios.id,
      descripcion: tareaCriterios.descripcion,
      completado: tareaCriterios.completado,
      verificadoEncargado: tareaCriterios.verificadoEncargado
    }).from(tareaCriterios).where(eq(tareaCriterios.tareaId, tarea.id)).orderBy(asc(tareaCriterios.creadoEn)),
    db.select({
      id: tareaArchivos.id,
      nombre: tareaArchivos.nombre,
      mimeType: tareaArchivos.mimeType,
      tamanoBytes: tareaArchivos.tamanoBytes,
      ruta: tareaArchivos.ruta,
      subidoPorId: tareaArchivos.subidoPorId,
      creadoEn: tareaArchivos.creadoEn,
      subidoPorNombre: usuarios.nombre,
      subidoPorRol: usuarios.rol
    })
      .from(tareaArchivos)
      .leftJoin(usuarios, eq(tareaArchivos.subidoPorId, usuarios.id))
      .where(eq(tareaArchivos.tareaId, tarea.id))
      .orderBy(asc(tareaArchivos.creadoEn)),
    // TW-10: Orden ascendente (asc) para integrar eventos cronológicamente en el chat
    db.select({
      id: tareaEventos.id,
      tareaId: tareaEventos.tareaId,
      tipo: tareaEventos.tipo,
      detalle: tareaEventos.detalle,
      creadoEn: tareaEventos.creadoEn,
      actorNombre: usuarios.nombre
    }).from(tareaEventos).leftJoin(usuarios, eq(tareaEventos.actorId, usuarios.id))
      .where(eq(tareaEventos.tareaId, tarea.id)).orderBy(asc(tareaEventos.creadoEn)),
    obtenerComentariosBD(tarea.id),
    // TW-11: Historial de solicitudes de delegación/reasignación de esta tarea
    db.select({
      id: tareaDelegaciones.id,
      solicitanteId: tareaDelegaciones.solicitanteId,
      destinatarioId: tareaDelegaciones.destinatarioId,
      motivo: tareaDelegaciones.motivo,
      estado: tareaDelegaciones.estado,
      creadaEn: tareaDelegaciones.creadaEn,
      respondidaEn: tareaDelegaciones.respondidaEn,
      solicitanteNombre: usuarios.nombre
    })
      .from(tareaDelegaciones)
      .leftJoin(usuarios, eq(tareaDelegaciones.solicitanteId, usuarios.id))
      .where(eq(tareaDelegaciones.tareaId, tarea.id))
      .orderBy(desc(tareaDelegaciones.creadaEn)),
    // TW-11: Lista de integrantes activos del departamento para que el encargado pueda reasignar
    esJefe && tarea.departamentoId
      ? db.select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.activo, true),
            eq(usuarios.departamentoId, tarea.departamentoId),
            inArray(usuarios.rol, ['MIEMBRO', 'ENCARGADO'])
          )
        )
        .orderBy(asc(usuarios.nombre))
      : Promise.resolve([])
  ]);

  const persona = (id: string | null) => personas.find((p) => p.id === id) ?? null;

  const archivos = archivosBD.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    subidoPorId: a.subidoPorId,
    mimeType: a.mimeType ?? 'application/octet-stream',
    tamanoBytes: a.tamanoBytes ?? 0,
    categoria: (a.subidoPorRol === 'ENCARGADO' ? 'RECURSO_GUIA' : 'EVIDENCIA') as 'RECURSO_GUIA' | 'EVIDENCIA',
    subidoPorNombre: a.subidoPorNombre ?? 'Usuario',
    subidoPorRol: a.subidoPorRol ?? 'MIEMBRO',
    creadoEn: a.creadoEn,
    urlDescarga: a.ruta
  }));

  // TW-10: Construir secuencia temporal unificada de mensajes + eventos
  const timeline = construirTimeline(comentarios, eventos);

  // TW-11: Datos de plazo del 20% y estado de la solicitud de reasignación
  const plazoReasignacion = calcularPlazoReasignacion(tarea.creadoEn, tarea.fechaLimite);
  const solicitudPendiente = delegacionesBD.find((d) => d.estado === 'PENDIENTE') ?? null;
  const ultimaRechazadaDelUsuario = delegacionesBD.find(
    (d) => d.estado === 'RECHAZADA' && d.solicitanteId === actor.id
  ) ?? null;

  let motivoUltimaRechazada: string | null = null;
  if (ultimaRechazadaDelUsuario?.motivo) {
    const partes = ultimaRechazadaDelUsuario.motivo.split(' || RECHAZO_ENCARGADO: ');
    motivoUltimaRechazada = partes[1] ?? null;
  }

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
      departamentoId: tarea.departamentoId,
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
    comentarios,
    eventos,
    timeline,
    // TW-11: Estado de reasignación y permisos
    reasignadaDelUsuario: esExResponsable,
    plazoReasignacion,
    solicitudPendiente: solicitudPendiente
      ? {
          id: solicitudPendiente.id,
          solicitanteId: solicitudPendiente.solicitanteId,
          solicitanteNombre: solicitudPendiente.solicitanteNombre ?? 'Miembro',
          motivo: solicitudPendiente.motivo ?? '',
          creadaEn: solicitudPendiente.creadaEn
        }
      : null,
    rechazoReasignacionReciente: motivoUltimaRechazada
      ? {
          motivoRechazo: motivoUltimaRechazada,
          respondidaEn: ultimaRechazadaDelUsuario?.respondidaEn ?? null
        }
      : null,
    miembrosParaReasignar: miembrosDepto.filter((m) => m.id !== tarea.responsableId),
    transicionesPermitidas: esExResponsable ? [] : transicionesPermitidas(actor, tarea.estado, tarea)
  };
}

/* ------------------------------------------------------------------ */
/* Lista de tareas con Timeline y estado de Reasignación (TW-03 a 11) */
/* ------------------------------------------------------------------ */

export async function listarMisTareas(actor: Actor) {
  // TW-11: Si es miembro, incluir también las tareas donde se aprobó su solicitud de reasignación
  let idsTareasReasignadas = new Set<string>();
  if (actor.rol === 'MIEMBRO') {
    const delegadasAceptadas = await db
      .select({ tareaId: tareaDelegaciones.tareaId })
      .from(tareaDelegaciones)
      .where(
        and(
          eq(tareaDelegaciones.solicitanteId, actor.id),
          eq(tareaDelegaciones.estado, 'ACEPTADA')
        )
      );
    idsTareasReasignadas = new Set(delegadasAceptadas.map((d) => d.tareaId));
  }

  const listaIdsEx = Array.from(idsTareasReasignadas);

  const filtro = actor.rol === 'ADMIN'
    ? undefined
    : actor.rol === 'ENCARGADO' && actor.departamentoId
      ? eq(tareas.departamentoId, actor.departamentoId)
      : listaIdsEx.length > 0
        ? or(eq(tareas.responsableId, actor.id), inArray(tareas.id, listaIdsEx))
        : eq(tareas.responsableId, actor.id);

  const tareasBase = await db.select({
    id: tareas.id,
    numero: tareas.numero,
    titulo: tareas.titulo,
    estado: tareas.estado,
    prioridad: tareas.prioridad,
    dificultad: tareas.dificultad,
    fechaLimite: tareas.fechaLimite,
    responsableId: tareas.responsableId,
    responsableNombre: usuarios.nombre
  }).from(tareas)
    .leftJoin(usuarios, eq(tareas.responsableId, usuarios.id))
    .where(filtro)
    .orderBy(asc(tareas.fechaLimite))
    .limit(200);

  if (tareasBase.length === 0) return [];

  const idsTareas = tareasBase.map((t) => t.id);
  const [todosLosMensajes, todosLosEventos, delegacionesPendientes] = await Promise.all([
    db
      .select({
        id: tareaMensajes.id,
        tareaId: tareaMensajes.tareaId,
        autorId: tareaMensajes.autorId,
        contenido: tareaMensajes.contenido,
        creadoEn: tareaMensajes.creadoEn,
        autorNombre: usuarios.nombre,
        autorRol: usuarios.rol
      })
      .from(tareaMensajes)
      .leftJoin(usuarios, eq(tareaMensajes.autorId, usuarios.id))
      .where(inArray(tareaMensajes.tareaId, idsTareas))
      .orderBy(asc(tareaMensajes.creadoEn)),
    db
      .select({
        id: tareaEventos.id,
        tareaId: tareaEventos.tareaId,
        tipo: tareaEventos.tipo,
        detalle: tareaEventos.detalle,
        creadoEn: tareaEventos.creadoEn,
        actorNombre: usuarios.nombre
      })
      .from(tareaEventos)
      .leftJoin(usuarios, eq(tareaEventos.actorId, usuarios.id))
      .where(inArray(tareaEventos.tareaId, idsTareas))
      .orderBy(asc(tareaEventos.creadoEn)),
    db
      .select({
        tareaId: tareaDelegaciones.tareaId
      })
      .from(tareaDelegaciones)
      .where(and(inArray(tareaDelegaciones.tareaId, idsTareas), eq(tareaDelegaciones.estado, 'PENDIENTE')))
  ]);

  const tareasConSolicitudPendiente = new Set(delegacionesPendientes.map((d) => d.tareaId));

  const mensajesPorTarea = new Map<string, ComentarioTarea[]>();
  for (const m of todosLosMensajes) {
    const lista = mensajesPorTarea.get(m.tareaId) ?? [];
    lista.push({
      id: m.id,
      tareaId: m.tareaId,
      autorId: m.autorId ?? '',
      autorNombre: m.autorNombre ?? 'Usuario',
      autorRol: m.autorRol ?? 'MIEMBRO',
      contenido: m.contenido,
      creadoEn: m.creadoEn
    });
    mensajesPorTarea.set(m.tareaId, lista);
  }

  const eventosPorTarea = new Map<string, EventoTarea[]>();
  for (const e of todosLosEventos) {
    const lista = eventosPorTarea.get(e.tareaId) ?? [];
    lista.push({
      id: e.id,
      tareaId: e.tareaId,
      tipo: e.tipo,
      detalle: e.detalle,
      creadoEn: e.creadoEn,
      actorNombre: e.actorNombre ?? null
    });
    eventosPorTarea.set(e.tareaId, lista);
  }

  return tareasBase.map((t) => {
    const comentarios = mensajesPorTarea.get(t.id) ?? [];
    const eventos = eventosPorTarea.get(t.id) ?? [];
    const reasignadaDelUsuario = idsTareasReasignadas.has(t.id) && t.responsableId !== actor.id;
    return {
      ...t,
      reasignadaDelUsuario,
      tieneSolicitudReasignacion: tareasConSolicitudPendiente.has(t.id),
      totalComentarios: comentarios.length,
      comentariosRecientes: comentarios,
      eventosRecientes: eventos,
      timeline: construirTimeline(comentarios, eventos)
    };
  });
}

/* ------------------------------------------------------------------ */
/* TW-07: Checklist Interactivo con Permisos y Doble Columna           */
/* ------------------------------------------------------------------ */

export async function toggleCriterioBD(
  actor: Actor,
  tareaId: string,
  criterioId: string,
  modo: 'RESPONSABLE' | 'ENCARGADO'
) {
  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');
  if (esExResponsable) error(403, 'Se ha validado la reasignación de esta actividad; ya no puedes modificar el checklist.');
  if (actor.rol === 'ADMIN') error(403, 'El administrador solo tiene permisos de lectura');
  if (!esUuid(criterioId)) error(400, 'Identificador de criterio inválido');

  const [actual] = await db
    .select()
    .from(tareaCriterios)
    .where(and(eq(tareaCriterios.id, criterioId), eq(tareaCriterios.tareaId, tarea.id)))
    .limit(1);

  if (!actual) error(404, 'El criterio no pertenece a esta tarea');

  if (modo === 'ENCARGADO') {
    if (!cumpleRol(actor, 'REVISOR', tarea)) {
      error(403, 'Solo el encargado o revisor puede verificar criterios');
    }
    if (tarea.estado !== 'EN_REVISION') {
      error(400, 'La verificación del encargado solo se realiza cuando la tarea está en revisión');
    }
    await db
      .update(tareaCriterios)
      .set({ verificadoEncargado: !actual.verificadoEncargado })
      .where(eq(tareaCriterios.id, criterioId));
  } else {
    const puedeAvanzar = cumpleRol(actor, 'RESPONSABLE', tarea) || cumpleRol(actor, 'REVISOR', tarea);
    if (!puedeAvanzar) {
      error(403, 'Solo el responsable asignado puede marcar el avance del checklist');
    }
    if (tarea.estado !== 'ASIGNADA' && tarea.estado !== 'EN_PROCESO') {
      error(400, 'El checklist de avance solo se modifica cuando la tarea está asignada o en proceso');
    }
    await db
      .update(tareaCriterios)
      .set({ completado: !actual.completado })
      .where(eq(tareaCriterios.id, criterioId));
  }
}

/* ------------------------------------------------------------------ */
/* TW-08 y TW-10: Gestión Segura de Archivos con Registro en Timeline  */
/* ------------------------------------------------------------------ */

function sanitizarNombreArchivo(nombreOriginal: string): string {
  const base = path.basename(nombreOriginal)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  return base.slice(0, 180) || 'archivo';
}

export async function registrarArchivo(
  actor: Actor,
  tareaId: string,
  archivoFile: File | null = null,
  enlaceUrl = '',
  enlaceTitulo = ''
) {
  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');
  if (esExResponsable) error(403, 'Se ha validado la reasignación de esta actividad; ya no puedes adjuntar archivos.');
  if (actor.rol === 'ADMIN') error(403, 'El administrador no puede adjuntar archivos');
  if (tarea.estado === 'TERMINADA') error(400, 'No se pueden adjuntar archivos a una tarea terminada');

  if (enlaceUrl) {
    let urlValida: URL;
    try {
      urlValida = new URL(enlaceUrl);
    } catch {
      error(400, 'El enlace proporcionado no es una URL válida');
    }
    if (urlValida.protocol !== 'http:' && urlValida.protocol !== 'https:') {
      error(400, 'El enlace debe comenzar con http:// o https://');
    }
    const nombreEnlace = (enlaceTitulo || enlaceUrl).slice(0, 255);

    await db.transaction(async (tx) => {
      await tx.insert(tareaArchivos).values({
        tareaId: tarea.id,
        subidoPorId: actor.id,
        nombre: nombreEnlace,
        mimeType: 'text/uri-list',
        tamanoBytes: 0,
        ruta: urlValida.toString()
      });

      await tx.insert(tareaEventos).values({
        tareaId: tarea.id,
        actorId: actor.id,
        tipo: 'ARCHIVO_SUBIDO',
        detalle: { nombre: nombreEnlace, esEnlace: true }
      });
    });
    return;
  }

  if (archivoFile) {
    if (archivoFile.size > MAX_ADJUNTO_BYTES) {
      error(400, `El archivo "${archivoFile.name}" supera el límite permitido de 10 MB.`);
    }

    const buffer = Buffer.from(await archivoFile.arrayBuffer());
    const baseUploads = path.resolve('uploads');
    const uploadDir = path.resolve(baseUploads, tarea.id);
    if (!uploadDir.startsWith(baseUploads)) {
      error(403, 'Ruta de almacenamiento inválida');
    }

    await fs.mkdir(uploadDir, { recursive: true });

    const nombreLimpio = sanitizarNombreArchivo(archivoFile.name);
    const safeName = `${crypto.randomBytes(4).toString('hex')}_${nombreLimpio}`;
    const filePath = path.resolve(uploadDir, safeName);

    if (!filePath.startsWith(uploadDir)) {
      error(403, 'Nombre de archivo no permitido');
    }

    await fs.writeFile(filePath, buffer);
    const nombreVisible = path.basename(archivoFile.name).slice(0, 255);

    await db.transaction(async (tx) => {
      await tx.insert(tareaArchivos).values({
        tareaId: tarea.id,
        subidoPorId: actor.id,
        nombre: nombreVisible,
        mimeType: archivoFile.type || 'application/octet-stream',
        tamanoBytes: archivoFile.size,
        ruta: `/uploads/${tarea.id}/${safeName}`
      });

      await tx.insert(tareaEventos).values({
        tareaId: tarea.id,
        actorId: actor.id,
        tipo: 'ARCHIVO_SUBIDO',
        detalle: { nombre: nombreVisible, esEnlace: false }
      });
    });
  }
}

export async function eliminarArchivoBD(actor: Actor, tareaId: string, archivoId: string) {
  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');
  if (esExResponsable) error(403, 'Se ha validado la reasignación de esta actividad; ya no puedes eliminar archivos.');
  if (actor.rol === 'ADMIN') error(403, 'El administrador no puede eliminar archivos');
  if (!esUuid(archivoId)) error(400, 'Identificador de archivo inválido');

  const [archivo] = await db
    .select()
    .from(tareaArchivos)
    .where(and(eq(tareaArchivos.id, archivoId), eq(tareaArchivos.tareaId, tarea.id)))
    .limit(1);

  if (!archivo) error(404, 'El archivo no existe en esta tarea');

  const esAutor = archivo.subidoPorId === actor.id;
  const esJefe = cumpleRol(actor, 'REVISOR', tarea);
  if (!esAutor && !esJefe) {
    error(403, 'Solo quien subió el archivo o el encargado puede eliminarlo');
  }

  await db.transaction(async (tx) => {
    await tx.delete(tareaArchivos).where(eq(tareaArchivos.id, archivo.id));

    await tx.insert(tareaEventos).values({
      tareaId: tarea.id,
      actorId: actor.id,
      tipo: 'ARCHIVO_ELIMINADO',
      detalle: { nombre: archivo.nombre }
    });
  });

  if (archivo.ruta.startsWith('/uploads/')) {
    const relativo = archivo.ruta.replace(/^\/uploads\//, '');
    const baseUploads = path.resolve('uploads');
    const rutaFisica = path.resolve(baseUploads, relativo);
    if (rutaFisica.startsWith(baseUploads)) {
      await fs.unlink(rutaFisica).catch(() => {});
    }
  }
}

/* ------------------------------------------------------------------ */
/* TW-09 y TW-11: Conversación Contextual con Candado por Reasignación */
/* ------------------------------------------------------------------ */

export async function agregarComentarioBD(actor: Actor, tareaId: string, contenidoTxt: string) {
  const tarea = await cargarTarea(tareaId);
  const { acceso, esExResponsable } = await puedeVerConReasignacion(actor, tarea);
  if (!acceso) error(403, 'No tienes acceso a esta tarea');
  if (esExResponsable) {
    error(403, 'Se ha validado la reasignación de la actividad que se le había imputado. Ya no puedes usar el chat de esta tarea.');
  }
  if (actor.rol === 'ADMIN') error(403, 'El administrador tiene acceso de solo lectura');

  const contenido = contenidoTxt.trim();
  if (!contenido) error(400, 'Escribe un mensaje antes de enviar.');
  if (contenido.length > MAX_MENSAJE) {
    error(400, `El comentario no puede superar los ${MAX_MENSAJE} caracteres.`);
  }

  await db.insert(tareaMensajes).values({
    tareaId: tarea.id,
    autorId: actor.id,
    contenido
  });
}

export async function obtenerComentariosBD(tareaId: string): Promise<ComentarioTarea[]> {
  const filas = await db
    .select({
      id: tareaMensajes.id,
      tareaId: tareaMensajes.tareaId,
      autorId: tareaMensajes.autorId,
      contenido: tareaMensajes.contenido,
      creadoEn: tareaMensajes.creadoEn,
      autorNombre: usuarios.nombre,
      autorRol: usuarios.rol
    })
    .from(tareaMensajes)
    .leftJoin(usuarios, eq(tareaMensajes.autorId, usuarios.id))
    .where(eq(tareaMensajes.tareaId, tareaId))
    .orderBy(asc(tareaMensajes.creadoEn));

  return filas.map((c) => ({
    id: c.id,
    tareaId: c.tareaId,
    autorId: c.autorId ?? '',
    autorNombre: c.autorNombre ?? 'Usuario',
    autorRol: c.autorRol ?? 'MIEMBRO',
    contenido: c.contenido,
    creadoEn: c.creadoEn
  }));
}

// =========================================================================
// ELIMINACIÓN DE TAREA
// =========================================================================
export async function eliminarTarea(actor: Actor, tareaId: string) {
  const tarea = await cargarTarea(tareaId);
  if (!puedeVer(actor, tarea)) {
    error(403, 'No tienes acceso a esta tarea');
  }

  const esJefeOAutor =
    actor.rol === 'ADMIN' ||
    (actor.rol === 'ENCARGADO' && actor.departamentoId === tarea.departamentoId) ||
    actor.id === tarea.creadoPorId;

  if (!esJefeOAutor) {
    error(403, 'Solo el encargado del departamento o quien creó la tarea puede eliminarla');
  }

  try {
    const uploadDir = path.resolve('uploads', tarea.id);
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch {

  }

  await db.delete(tareas).where(eq(tareas.id, tarea.id));

  return { id: tarea.id, eliminada: true };
}