'use client';

import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { useEffect, useState } from 'react';

export function HeaderUser() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setEmail(data?.user?.email || null);
    });
  }, []);

  if (email) {
    return (
      <Link className="small-text-btn" href="/account">
        {email.split('@')[0]}
      </Link>
    );
  }
  return (
    <Link className="small-text-btn" href="/auth/sign-in">
      구글 로그인
    </Link>
  );
}
