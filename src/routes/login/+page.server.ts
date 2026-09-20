import { fail, redirect, type Actions } from '@sveltejs/kit';
import { autenticar, crearSesion } from '$lib/server/auth';

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
