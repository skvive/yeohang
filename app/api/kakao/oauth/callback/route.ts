import { NextRequest, NextResponse } from 'next/server';
import {
  KAKAO_STATE_COOKIE, KAKAO_SESSION_COOKIE, kakaoConfigured, configuredOrigin,
  exchangeKakaoCode, kakaoCookieOptions, kakaoSessionMaxAge, retrieveKakaoId,
  safeStateEquals, signKakaoSession,
} from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = configuredOrigin();
  if (!kakaoConfigured() || !origin) {
    return NextResponse.json({ error: '카카오 로그인 설정이 완료되지 않았습니다.' }, { status: 503 });
  }
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const cookieState = request.cookies.get(KAKAO_STATE_COOKIE)?.value || '';
  // Each state can be used only once in an ordinary browser: callback always expires it.
  const fail = (kind: 'cancel' | 'failed') => {
    const response = NextResponse.redirect(new URL('/auth/sign-in?kakao=' + kind, origin), 303);
    response.cookies.set(KAKAO_STATE_COOKIE, '', { ...kakaoCookieOptions, maxAge: 0 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  if (url.searchParams.has('error')) return fail('cancel');
  if (!cookieState || !safeStateEquals(cookieState, state) || !code || code.length > 2048) return fail('failed');
  const accessToken = await exchangeKakaoCode(code);
  if (!accessToken) return fail('failed');
  const id = await retrieveKakaoId(accessToken);
  if (!id) return fail('failed');
  const signed = signKakaoSession(id);
  if (!signed) return fail('failed');
  const response = NextResponse.redirect(new URL('/account', origin), 303);
  response.cookies.set(KAKAO_STATE_COOKIE, '', { ...kakaoCookieOptions, maxAge: 0 });
  response.cookies.set(KAKAO_SESSION_COOKIE, signed, { ...kakaoCookieOptions, maxAge: kakaoSessionMaxAge });
  response.headers.set('Cache-Control', 'no-store');
  // Kakao bearer/refresh tokens are never returned to the browser or persisted in cookies.
  return response;
}
