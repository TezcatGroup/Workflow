/** Regla compartida por todas las vistas de progreso. */
export const XP_POR_NIVEL = 1000;
export function calcularNivel(xp: number) {
  const total = Math.max(0, Number(xp) || 0);
  const nivel = Math.floor(total / XP_POR_NIVEL) + 1;
  return { nivel, xpMeta: nivel * XP_POR_NIVEL, nivelSiguiente: nivel + 1 };
}
