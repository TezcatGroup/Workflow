import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cargarTarea, puedeVer } from '$lib/server/tareas';
import fs from 'fs/promises';
import path from 'path';

const TIPOS_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};

// Solo formatos seguros se abren inline en pestaña; el resto (incluyendo SVG) se fuerza a descarga
const EXTENSIONES_INLINE = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt']);

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    error(401, 'Debes iniciar sesión para consultar este archivo');
  }

  let rutaArchivo = params.archivo;
  if (!rutaArchivo) {
    error(400, 'Ruta de archivo no especificada');
  }

  try {
    rutaArchivo = decodeURIComponent(rutaArchivo);
  } catch {
    // conservar original si ya viene decodificado
  }

  // Verificar permisos sobre la tarea (el primer segmento de /uploads/<tareaId>/<archivo> es tareaId)
  const [tareaId] = rutaArchivo.split('/');
  if (!tareaId) error(400, 'Ruta de tarea inválida');
  const tarea = await cargarTarea(tareaId);
  if (!puedeVer(locals.user, tarea)) {
    error(403, 'No tienes permiso para acceder a los archivos de esta tarea');
  }

  const directorioBase = path.resolve('uploads');
  const rutaFisica = path.resolve(directorioBase, rutaArchivo);

  if (!rutaFisica.startsWith(directorioBase)) {
    error(403, 'Acceso denegado a la ruta solicitada');
  }

  try {
    const buffer = await fs.readFile(rutaFisica);
    const extension = path.extname(rutaFisica).toLowerCase();
    const contentType = TIPOS_MIME[extension] ?? 'application/octet-stream';
    const disposicion = EXTENSIONES_INLINE.has(extension) ? 'inline' : 'attachment';
    const nombreDescarga = path.basename(rutaFisica);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposicion}; filename="${encodeURIComponent(nombreDescarga)}"`,
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    error(404, 'El archivo solicitado no existe o fue eliminado');
  }
};