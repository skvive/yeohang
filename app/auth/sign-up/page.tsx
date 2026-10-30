'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { OAuthButtons } from '../OAuthButtons';
import { signUpWithEmail } from './actions';

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, null);
  return (
    <div className="auth-card">
      <div className="auth-brand">
        <img src="/assets/wordmark.svg" alt="여행갈지도" />
      </div>
      <h1>회원가입</h1>
      <p className="sub">구글 계정으로 바로 시작하거나 이메일을 등록하세요.</p>
      <OAuthButtons callbackURL="/" errorURL="/auth/sign-up" />
      <div className="auth-divider">또는 이메일</div>
      <form action={formAction}>
        <div className="auth-field">
          <label htmlFor="name">이름</label>
          <input id="name" name="name" required autoComplete="name" placeholder="여행자" />
        </div>
        <div className="auth-field">
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="auth-field">
          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        {state?.error ? <p className="auth-error">{state.error}</p> : null}
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? '가입 중…' : '이메일로 가입'}
        </button>
      </form>
      <p className="auth-foot">
        이미 계정이 있나요? <Link href="/auth/sign-in">로그인</Link>
      </p>
    </div>
  );
}
