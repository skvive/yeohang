import { auth } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await auth.signOut();
  } catch {
    // session may already be empty
  }
  return Response.json({ logged_out: true });
}
