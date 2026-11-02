import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const KAKAO_STATE_COOKIE = '__Host-yg-kakao-state';
export const KAKAO_SESSION_COOKIE = '__Host-yg-kakao-session';
export const KAKAO_CALLBACK_PATH = '/api/kakao/oauth/callback';
const KAKAO_SESSION_SECONDS = 60 * 60 * 8;

type KakaoSession = { v: 1; provider: 'kakao'; sub: string; exp: number };

function key(): string | null {
  const value = process.env.KAKAO_SESSION_SECRET?.trim() || '';
  return value.length >= 32 && !value.includes('[SENSITIVE]') ? value : null;
}

export function configuredOrigin(): string | null {
  const raw = process.env.KAKAO_OAUTH_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function kakaoConfigured(): boolean {
  // Kakao REST API keys are provisioned with client-secret enforcement by default.
  // Fail closed until the secret is configured, rather than showing a broken login button.
  return Boolean(
    configuredOrigin() &&
    /^[A-Za-z0-9]{20,128}$/.test(process.env.KAKAO_REST_API_KEY || '') &&
    (process.env.KAKAO_CLIENT_SECRET || '').trim().length >= 16 &&
    key()
  );
}

export function kakaoRedirectUri(): string | null {
  const origin = configuredOrigin();
  return origin ? origin + KAKAO_CALLBACK_PATH : null;
}

export function newKakaoState(): string {
  return randomBytes(32).toString('base64url');
}

export function safeStateEquals(a: string, b: string): boolean {
  if (!/^[A-Za-z0-9_-]{35,100}$/.test(a) || !/^[A-Za-z0-9_-]{35,100}$/.test(b)) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signKakaoSession(sub: string): string | null {
  const secret = key();
  if (!secret || !/^[0-9]{1,24}$/.test(sub)) return null;
  const payload: KakaoSession = { v: 1, provider: 'kakao', sub, exp: Date.now() + KAKAO_SESSION_SECONDS * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + sig;
}

export function verifyKakaoSession(value: string | undefined): KakaoSession | null {
  const secret = key();
  if (!secret || !value || value.length > 1400) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [data, provided] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(data) || !/^[A-Za-z0-9_-]+$/.test(provided)) return null;
  const expected = createHmac('sha256', secret).update(data).digest();
  const signature = Buffer.from(provided, 'base64url');
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as KakaoSession;
    if (
      session.v !== 1 || session.provider !== 'kakao' ||
      typeof session.sub !== 'string' || !/^[0-9]{1,24}$/.test(session.sub) ||
      typeof session.exp !== 'number' || session.exp < Date.now() ||
      session.exp > Date.now() + KAKAO_SESSION_SECONDS * 1000 + 60_000
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export async function exchangeKakaoCode(code: string): Promise<string | null> {
  const redirectUri = kakaoRedirectUri();
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!redirectUri || !clientId || code.length > 2048) return null;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
  try {
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { access_token?: unknown };
    return typeof payload.access_token === 'string' && payload.access_token.length < 4096
      ? payload.access_token : null;
  } catch {
    return null;
  }
}

export async function retrieveKakaoId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { id?: number | string };
    const id = String(data.id ?? '');
    return /^[0-9]{1,24}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const kakaoCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

export const kakaoSessionMaxAge = KAKAO_SESSION_SECONDS;
