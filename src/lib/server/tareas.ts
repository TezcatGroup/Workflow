import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos, tareaCriterios, tareaEventos, tareas, usuarios } from '$lib/server/db/schema';
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
