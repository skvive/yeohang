'use client';

import { authClient } from '@/lib/auth/client';
import { useState } from 'react';

export function OAuthButtons({ callbackURL = '/account', errorURL = '/auth/sign-in' }: { callbackURL?: string; errorURL?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      {err ? <p className="auth-error">{err}</p> : null}
      <p className="auth-oauth-note">구글 계정으로 로그인합니다. 파트너 콘솔·저장 숙소에 계정이 연결됩니다.</p>
    </div>
  );
}
