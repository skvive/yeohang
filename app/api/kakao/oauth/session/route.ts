import { NextRequest, NextResponse } from 'next/server';
import { KAKAO_SESSION_COOKIE, verifyKakaoSession } from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const session = verifyKakaoSession(request.cookies.get(KAKAO_SESSION_COOKIE)?.value);
  return NextResponse.json(session
    ? { authenticated: true, provider: 'kakao', scope: 'traveler', partner_access: false }
    : { authenticated: false, provider: 'kakao' },
    { headers: { 'Cache-Control': 'private, no-store' } });
}
