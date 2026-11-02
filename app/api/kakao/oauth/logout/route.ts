import { NextRequest, NextResponse } from 'next/server';
import { KAKAO_SESSION_COOKIE, kakaoCookieOptions } from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: NextRequest) {
  // This ends the local traveler session, not the Kakao account's own login session.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const response = NextResponse.json({ logged_out: true }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
  response.cookies.set(KAKAO_SESSION_COOKIE, '', { ...kakaoCookieOptions, maxAge: 0 });
  return response;
}
