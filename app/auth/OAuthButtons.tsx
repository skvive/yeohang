'use client';

import { authClient } from '@/lib/auth/client';
import { useEffect, useState } from 'react';

export function OAuthButtons({ callbackURL = '/account', errorURL = '/auth/sign-in' }: { callbackURL?: string; errorURL?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const status = new URLSearchParams(window.location.search).get('kakao');
    if (status === 'cancel') setKakaoError('카카오 로그인이 취소됐습니다.');
    else if (status === 'failed') setKakaoError('카카오 인증에 실패했습니다. 다시 로그인해 주세요.');
    fetch('/api/kakao/oauth/config', { cache: 'no-store', signal: controller.signal })
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => setKakaoReady(data.enabled === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function social(provider: 'google') {
    setErr(null);
    setBusy(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: errorURL });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '구글 로그인에 실패했습니다.');
      setBusy(null);
    }
  }

  return (
    <div className="auth-oauth">
      <button type="button" className="auth-oauth-btn google" disabled={!!busy} onClick={() => social('google')}>
        {busy === 'google' ? '연결 중…' : '구글로 계속하기'}
      </button>
      {kakaoReady
        ? <a className="auth-oauth-btn kakao" href="/api/kakao/oauth/start">카카오 계정으로 계속하기</a>
        : <button className="auth-oauth-btn kakao" type="button" disabled title="카카오 OAuth 키와 Redirect URI 등록이 필요합니다.">카카오 로그인 · 설정 대기</button>}
      {(err || kakaoError) ? <p role="alert" className="auth-error">{err || kakaoError}</p> : null}
      <p className="auth-oauth-note">카카오 로그인은 여행자용 별도 세션입니다. 파트너 콘솔과 관리자 권한은 기존 구글·이메일 인증을 사용합니다.</p>
    </div>
  );
}
