'use client';

import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { useEffect, useState } from 'react';
import '../auth/auth.css';

type Identity = { provider: 'neon' | 'kakao'; label: string };

export default function AccountPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;
    (async () => {
      // Existing Neon Auth remains authoritative for owner/admin/partner access.
      try {
        const { data } = await authClient.getSession();
        if (disposed) return;
        if (data?.user) {
          setIdentity({ provider: 'neon', label: data.user.email || 'Neon 계정' });
          return;
        }
      } catch {}
      try {
        const response = await fetch('/api/kakao/oauth/session', { cache: 'no-store' });
        const result = response.ok ? await response.json() : null;
        if (disposed) return;
        if (result?.authenticated === true && result?.provider === 'kakao') {
          setIdentity({ provider: 'kakao', label: '카카오 여행자 계정' });
          return;
        }
      } catch {}
      if (!disposed) location.href = '/auth/sign-in';
    })();
    return () => { disposed = true; };
  }, []);

  async function logout() {
    if (!identity) return;
    setBusy(true);
    try {
      if (identity.provider === 'kakao') {
        const response = await fetch('/api/kakao/oauth/logout', { method: 'POST', cache: 'no-store' });
        if (!response.ok) throw new Error('Kakao logout failed');
      } else {
        await authClient.signOut();
      }
      location.href = '/';
    } catch {
      setBusy(false);
      alert('로그아웃에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/assets/wordmark.svg" alt="여행갈지도" />
        </div>
        <h1>내 계정</h1>
        <p className="sub">{identity?.label || '로그인 정보를 확인하는 중…'}</p>
        {identity?.provider === 'kakao' ? (
          <>
            <p className="sub">카카오 여행자 계정으로 로그인되었습니다. 관리자·파트너 권한은 별도의 Neon 인증이 필요합니다.</p>
            <Link className="auth-submit" href="/#map" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              주변 여행지도 열기
            </Link>
          </>
        ) : (
          <>
            <p className="sub">기존 Neon 계정 권한에 따라 파트너 콘솔을 이용할 수 있습니다.</p>
            <Link className="auth-submit" href="/#merchant" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              파트너 콘솔로
            </Link>
          </>
        )}
        <button type="button" className="auth-oauth-btn" style={{ marginTop: 12, width: '100%' }}
          disabled={busy || !identity} onClick={logout}>
          {busy ? '로그아웃 중…' : '로그아웃'}
        </button>
      </div>
    </div>
  );
}
