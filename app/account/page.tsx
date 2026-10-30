'use client';

import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) {
        location.href = '/auth/sign-in';
        return;
      }
      setEmail(data.user.email || null);
    });
  }, []);

  async function logout() {
    setBusy(true);
    await authClient.signOut();
    location.href = '/';
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/assets/wordmark.svg" alt="여행갈지도" />
        </div>
        <h1>내 계정</h1>
        <p className="sub">{email || '불러오는 중…'}</p>
        <p className="sub">로그인 세션이 숙소 파트너 콘솔과 쿠폰 발급에 사용됩니다.</p>
        <Link className="auth-submit" href="/#merchant" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          파트너 콘솔로
        </Link>
        <button className="auth-oauth-btn" style={{ marginTop: 12, width: '100%' }} disabled={busy} onClick={logout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
