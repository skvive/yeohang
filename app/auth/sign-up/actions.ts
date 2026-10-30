'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '여행자');
  const { error } = await auth.signUp.email({ email, password, name });
  if (error) return { error: error.message || '회원가입에 실패했습니다.' };
  redirect('/');
}
