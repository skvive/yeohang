import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Kakao OAuth uses server-only REST credentials and signed host cookies', () => {
  const src = load('lib/kakao/oauth.ts');
  assert.match(src, /KAKAO_REST_API_KEY/);
  assert.match(src, /KAKAO_CLIENT_SECRET/);
  assert.match(src, /KAKAO_SESSION_SECRET/);
  assert.match(src, /__Host-yg-kakao-state/);
  assert.match(src, /__Host-yg-kakao-session/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /sameSite: 'lax'/);
  assert.match(src, /httpOnly: true/);
  assert.match(src, /kauth\.kakao\.com\/oauth\/token/);
  assert.match(src, /kapi\.kakao\.com\/v2\/user\/me/);
  assert.doesNotMatch(src, /console\.log\(.*(?:accessToken|client_secret)/);
});

test('OAuth endpoints require matching host, CSRF state and validated token', () => {
  const start = load('app/api/kakao/oauth/start/route.ts');
  const config = load('app/api/kakao/oauth/config/route.ts');
  const callback = load('app/api/kakao/oauth/callback/route.ts');
  const session = load('app/api/kakao/oauth/session/route.ts');
  const logout = load('app/api/kakao/oauth/logout/route.ts');
  assert.match(config, /request\.nextUrl\.origin === configuredOrigin\(\)/);
  assert.match(start, /request\.nextUrl\.origin !== origin/);
  assert.match(callback, /request\.nextUrl\.origin !== origin/);
  assert.match(callback, /safeStateEquals\(cookieState, state\)/);
  assert.match(callback, /exchangeKakaoCode\(code\)/);
  assert.match(session, /partner_access: false/);
  assert.match(logout, /sameSite|kakaoCookieOptions/);
});

test('Neon owner and partner permissions are never granted by Kakao traveler session', () => {
  const account = load('app/account/page.tsx');
  const button = load('app/auth/OAuthButtons.tsx');
  const privileged = load('app/api/auth/status/route.ts');
  assert.match(account, /provider === 'kakao'/);
  assert.match(account, /파트너 권한은 별도의 Neon 인증/);
  assert.match(button, /kakaoReady/);
  assert.match(button, /카카오 로그인 · 설정 대기/);
  assert.match(button, /카카오 인증에 실패/);
  assert.doesNotMatch(privileged, /KAKAO_SESSION_COOKIE|verifyKakaoSession/);
});

test('Kakao API keys are not published through NEXT_PUBLIC secret variable names', () => {
  const layout = load('app/layout.tsx');
  const config = load('app/api/kakao/oauth/config/route.ts');
  assert.doesNotMatch(layout, /NEXT_PUBLIC_KAKAO_REST_API_KEY|NEXT_PUBLIC_KAKAO_CLIENT_SECRET/);
  assert.doesNotMatch(config, /process\.env\.KAKAO_REST_API_KEY/);
});
