import { fail, redirect, type Actions } from '@sveltejs/kit';
import { autenticar, crearSesion } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { googleConfig } from '$lib/server/google-oauth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  const config = googleConfig(env);
  const mensajes: Record<string, string> = {
    unavailable: 'El acceso con Google no está disponible. Puedes usar tu correo y contraseña.',
    origin: 'Abre la dirección configurada para Google o usa tu correo y contraseña.',
    denied: 'No se pudo iniciar sesión con Google. Usa el correo verificado de una cuenta activa ya creada en Workflow (Gmail o Google Workspace), o entra con tu contraseña.'
  };
  return { googleDisponible: !!config && config.origin === url.origin,
    googleError: mensajes[url.searchParams.get('google') ?? ''] ?? null };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { error: 'Ingresa correo y contraseña.' });
    const user = await autenticar(email, password);
    if (!user) return fail(400, { error: 'Credenciales inválidas o cuenta no disponible.' });
    await crearSesion(user.id, cookies);
    redirect(303, '/dashboard');
  }
};
