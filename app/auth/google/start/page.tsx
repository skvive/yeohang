'use client';

import { authClient } from '@/lib/auth/client';
import { useEffect, useState } from 'react';

export default function GoogleStartPage() {
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    authClient
      .signIn.social({ provider: 'google', callbackURL: '/#merchant', errorCallbackURL: '/auth/sign-in' })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Google 로그인에 실패했습니다.'));
  }, []);
  return (
    <div className="auth-card">
      <h1>Google 연결 중</h1>
      <p className="sub">계정 선택 화면으로 이동합니다.</p>
      {err ? <p className="auth-error">{err}</p> : null}
    </div>
  );
}
