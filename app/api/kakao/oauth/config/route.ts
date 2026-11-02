import { NextResponse } from 'next/server';
import { kakaoConfigured } from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ enabled: kakaoConfigured() }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
