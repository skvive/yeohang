import { NextRequest, NextResponse } from 'next/server';
import { configuredOrigin, kakaoConfigured } from '@/lib/kakao/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fail closed on other preview/custom domains: cross-host OAuth state cookies cannot round-trip. */
export function GET(request: NextRequest) {
  const enabled = kakaoConfigured() && request.nextUrl.origin === configuredOrigin();
  return NextResponse.json({ enabled }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
