import type { rolUsuario } from '$lib/server/db/schema';

type Rol = (typeof rolUsuario.enumValues)[number];

declare global {
  namespace App {
    interface Locals {
      user: { id: string; nombre: string; rol: Rol; departamentoId: string | null } | null;
    }
  }
}

export {};
