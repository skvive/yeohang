import { NextRequest, NextResponse } from 'next/server';
import { KAKAO_STATE_COOKIE, kakaoConfigured, kakaoCookieOptions, kakaoRedirectUri, newKakaoState, configuredOrigin } from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(_request: NextRequest) {
  const origin = configuredOrigin();
  const redirectUri = kakaoRedirectUri();
  if (!kakaoConfigured() || !origin || !redirectUri) {
    return NextResponse.json({ error: '카카오 로그인 설정이 완료되지 않았습니다.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
  const state = newKakaoState();
  const authorize = new URL('https://kauth.kakao.com/oauth/authorize');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', process.env.KAKAO_REST_API_KEY!);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('state', state);
  const response = NextResponse.redirect(authorize, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(KAKAO_STATE_COOKIE, state, { ...kakaoCookieOptions, maxAge: 600 });
  return response;
}
