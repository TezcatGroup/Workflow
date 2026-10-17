import { fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { campo } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { tareaArchivos, tareaMensajes, usuarios } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import {
  cambiarEstado,
  obtenerDetalle,
  toggleCriterioBD,
  registrarArchivo,
  eliminarArchivoBD,
  agregarComentarioBD
} from '$lib/server/tareas';

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) redirect(303, '/login');

  const detalle = await obtenerDetalle(user, params.id);

  // 1. Extraer archivos reales desde PostgreSQL con datos del autor (TW-08)
  const archivosBD = await db
    .select({
      id: tareaArchivos.id,
      nombre: tareaArchivos.nombre,
      mimeType: tareaArchivos.mimeType,
      tamanoBytes: tareaArchivos.tamanoBytes,
      ruta: tareaArchivos.ruta,
      creadoEn: tareaArchivos.creadoEn,
      subidoPorNombre: usuarios.nombre,
      subidoPorRol: usuarios.rol
    })
    .from(tareaArchivos)
    .leftJoin(usuarios, eq(tareaArchivos.subidoPorId, usuarios.id))
    .where(eq(tareaArchivos.tareaId, params.id))
    .orderBy(asc(tareaArchivos.creadoEn));

  const archivos = archivosBD.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    mimeType: a.mimeType ?? 'application/octet-stream',
    tamanoBytes: a.tamanoBytes ?? 0,
    categoria: (a.subidoPorRol === 'ENCARGADO' ? 'RECURSO_GUIA' : 'EVIDENCIA') as
      | 'RECURSO_GUIA'
      | 'EVIDENCIA',
    subidoPorNombre: a.subidoPorNombre ?? 'Usuario',
    subidoPorRol: a.subidoPorRol ?? 'MIEMBRO',
    creadoEn: a.creadoEn,
    urlDescarga: a.ruta
  }));

  // 2. Extraer comentarios reales con nombre y rol del autor (TW-09)
  const comentariosBD = await db
    .select({
      id: tareaMensajes.id,
      autorId: tareaMensajes.autorId,
      contenido: tareaMensajes.contenido,
      creadoEn: tareaMensajes.creadoEn,
      autorNombre: usuarios.nombre,
      autorRol: usuarios.rol
    })
    .from(tareaMensajes)
    .leftJoin(usuarios, eq(tareaMensajes.autorId, usuarios.id))
    .where(eq(tareaMensajes.tareaId, params.id))
    .orderBy(asc(tareaMensajes.creadoEn));

  const comentarios = comentariosBD.map((c) => ({
    id: c.id,
    autorId: c.autorId ?? '',
    autorNombre: c.autorNombre ?? 'Usuario',
    autorRol: c.autorRol ?? 'MIEMBRO',
    contenido: c.contenido,
    creadoEn: c.creadoEn
  }));

  // 3. Mapear criterios (TW-07): sincroniza completado con la verificación
  const criterios = detalle.criterios.map((c) => ({
    ...c,
    verificadoEncargado: c.completado
  }));

  return {
    user,
    ...detalle,
    criterios,
    archivos,
    comentarios
  };
};

export const actions: Actions = {
  cambiarEstado: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');
    const form = await request.formData();
    const nuevoEstado = campo(form, 'estado');

    // Validación TW-07: verificar que todos los criterios estén completos antes de avanzar
    const detalle = await obtenerDetalle(user, params.id);
    if (
      (nuevoEstado === 'EN_REVISION' || nuevoEstado === 'TERMINADA') &&
      detalle.criterios.some((c) => !c.completado)
    ) {
      return fail(400, {
        error: 'Todos los criterios de aceptación deben estar marcados antes de continuar.'
      });
    }

    try {
      await cambiarEstado(user, params.id, nuevoEstado);
      return { ok: 'Estado actualizado correctamente.' };
    } catch (e) {
      if (isHttpError(e)) return fail(e.status, { error: e.body.message });
      throw e;
    }
  },

  // TW-07: Actualización real en BD
  toggleCriterio: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const criterioId = String(form.get('criterioId') ?? '');
    const modo = String(form.get('modo') ?? 'RESPONSABLE');

    if (!criterioId) return fail(400, { error: 'Identificador de criterio inválido.' });

    await toggleCriterioBD(criterioId, modo as 'RESPONSABLE' | 'ENCARGADO');
    return { ok: 'Criterio actualizado.' };
  },

  // TW-08: Inserción real en BD con validación de 10 MB
  subirArchivo: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const archivosForm = form
      .getAll('archivos')
      .filter((item): item is File => item instanceof File && item.size > 0);
    const enlaceUrl = String(form.get('enlaceUrl') ?? '').trim();
    const enlaceTitulo = String(form.get('enlaceTitulo') ?? '').trim();

    if (archivosForm.length === 0 && !enlaceUrl) {
      return fail(400, { error: 'Selecciona al menos un archivo o proporciona un enlace válido.' });
    }

    const LIMITE_BYTES = 10 * 1024 * 1024;
    for (const f of archivosForm) {
      if (f.size > LIMITE_BYTES) {
        return fail(400, { error: `El archivo "${f.name}" excede el tamaño máximo de 10 MB.` });
      }
    }

    if (archivosForm.length > 0) {
      for (const f of archivosForm) {
        await registrarArchivo(params.id, user.id, f);
      }
    } else if (enlaceUrl) {
      await registrarArchivo(params.id, user.id, null, enlaceUrl, enlaceTitulo);
    }

    return { ok: 'Material adjuntado correctamente a la tarea.' };
  },

  // TW-08: Borrado real en BD
  eliminarArchivo: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const archivoId = String(form.get('archivoId') ?? '');

    if (!archivoId) return fail(400, { error: 'Archivo inválido.' });
    await eliminarArchivoBD(archivoId);

    return { ok: 'Archivo eliminado.' };
  },

  // TW-09: Inserción real en BD
  comentar: async ({ locals, params, request }) => {
    const user = locals.user;
    if (!user) redirect(303, '/login');

    const form = await request.formData();
    const contenido = String(form.get('contenido') ?? '').trim();

    if (!contenido) return fail(400, { error: 'Escribe un mensaje antes de enviar.' });
    if (contenido.length > 2000) {
      return fail(400, { error: 'El comentario no puede superar los 2000 caracteres.' });
    }

    await agregarComentarioBD(params.id, user.id, contenido);

    return { ok: 'Comentario enviado.' };
  }
};