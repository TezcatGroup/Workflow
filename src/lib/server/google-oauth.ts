import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTVerifyGetKey } from 'jose';

export const GOOGLE_FLOW_COOKIE = 'workflow_google_flow';
export const GOOGLE_CALLBACK_PATH = '/login/google/callback';
const FLOW_AGE = 600;
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 10000 });
export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string; origin: string; secure: boolean };
export type GoogleIdentity = { sub: string; email: string };
export class GoogleAccessError extends Error {}

// Nunca deriva redirect_uri de Host o de parámetros enviados por el visitante.
export function googleConfig(environment: Record<string, string | undefined>): GoogleConfig | null {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = environment.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const url = new URL(redirectUri);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== GOOGLE_CALLBACK_PATH ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return { clientId, clientSecret, redirectUri: url.href, origin: url.origin, secure: url.protocol === 'https:' };
  } catch { return null; }
}

function flowKey(config: GoogleConfig) {
  return createHash('sha256').update('workflow-google-flow\0' + config.clientSecret).digest();
}
function equal(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function comenzarGoogle(config: GoogleConfig) {
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const cookie = await new SignJWT({ state, nonce, verifier, redirectUri: config.redirectUri })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer('workflow-google-flow').setAudience(config.clientId)
    .setIssuedAt().setExpirationTime(`${FLOW_AGE}s`).sign(flowKey(config));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
    response_type: 'code', scope: 'openid email', state, nonce, prompt: 'select_account',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return { cookie, url: url.href, maxAge: FLOW_AGE };
}

export async function validarFlujoGoogle(cookie: string, state: string, config: GoogleConfig) {
  const { payload } = await jwtVerify(cookie, flowKey(config), { algorithms: ['HS256'],
    issuer: 'workflow-google-flow', audience: config.clientId, maxTokenAge: '10m', requiredClaims: ['exp', 'iat'] });
  if (typeof payload.state !== 'string' || !state || !equal(payload.state, state) ||
    typeof payload.nonce !== 'string' || typeof payload.verifier !== 'string' || payload.redirectUri !== config.redirectUri) {
    throw new GoogleAccessError('Flujo inválido');
  }
  return { nonce: payload.nonce, verifier: payload.verifier };
}

export async function validarTokenGoogle(token: string, config: GoogleConfig, nonce: string, keys: JWTVerifyGetKey = googleKeys): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(token, keys, { algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId,
    requiredClaims: ['exp', 'iat', 'sub', 'email', 'email_verified', 'nonce'], maxTokenAge: '1h', clockTolerance: 5 });
  if (typeof payload.nonce !== 'string' || !equal(payload.nonce, nonce) ||
    typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
    typeof payload.email !== 'string' || payload.email.length > 320 || payload.email_verified !== true ||
    (payload.azp !== undefined && payload.azp !== config.clientId)) throw new GoogleAccessError('Identidad inválida');
  const email = payload.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GoogleAccessError('Correo inválido');
  // Google no garantiza la propiedad actual de correos externos a Gmail/Workspace.
  if (!email.endsWith('@gmail.com') && !(typeof payload.hd === 'string' && payload.hd.length > 0)) {
    throw new GoogleAccessError('Usa Gmail o Google Workspace');
  }
  return { sub: payload.sub, email };
}

export async function intercambiarCodigoGoogle(code: string, verifier: string, config: GoogleConfig) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(10000), redirect: 'error',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: config.clientId,
      client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code' })
  });
  if (!response.ok) throw new GoogleAccessError('Google no autorizó el acceso');
  const result = await response.json();
  if (typeof result.id_token !== 'string') throw new GoogleAccessError('Falta identidad de Google');
  return result.id_token as string;
}
