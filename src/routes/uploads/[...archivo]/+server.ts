import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

// Mapeo de tipos para que el navegador abra el documento en vez de fallar
const TIPOS_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};

export const GET: RequestHandler = async ({ params, locals }) => {
  // 1. Validar que el usuario tenga sesión activa
  if (!locals.user) {
    error(401, 'Debes iniciar sesión para consultar este archivo');
  }

  let rutaArchivo = params.archivo;
  if (!rutaArchivo) {
    error(400, 'Ruta de archivo no especificada');
  }

  // Decodificar caracteres especiales (espacios, acentos)
  try {
    rutaArchivo = decodeURIComponent(rutaArchivo);
  } catch {
    // Mantener la ruta original si ya venía decodificada
  }

  // 2. Prevenir vulnerabilidades de Path Traversal
  const directorioBase = path.resolve('uploads');
  const rutaFisica = path.resolve(directorioBase, rutaArchivo);

  if (!rutaFisica.startsWith(directorioBase)) {
    error(403, 'Acceso denegado a la ruta solicitada');
  }

  // 3. Leer el archivo y entregarlo con las cabeceras adecuadas
  try {
    const buffer = await fs.readFile(rutaFisica);
    const extension = path.extname(rutaFisica).toLowerCase();
    const contentType = TIPOS_MIME[extension] ?? 'application/octet-stream';
    const nombreDescarga = path.basename(rutaFisica);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // 'inline' permite abrir PDFs e imágenes en el navegador; usa 'attachment' si prefieres descarga directa
        'Content-Disposition': `inline; filename="${encodeURIComponent(nombreDescarga)}"`
      }
    });
  } catch {
    error(404, 'El archivo solicitado no existe o fue eliminado');
  }
};