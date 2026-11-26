import { NextRequest, NextResponse } from 'next/server';
import { routeDetails } from '@/lib/navigation-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read-only Kakao Mobility driving route and geometry preview. The native
 * Kakao Navi SDK owns live turn-by-turn guidance and rerouting.
 * No location data is logged, cached or persisted.
 */
type Point = { lng: number; lat: number };
type WindowLimit = { start: number; count: number };
const attempts = new Map<string, WindowLimit>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

function parsePoint(value: string | null): Point | null {
  if (!value || value.length > 54) return null;
  const parts = value.split(',');
  if (parts.length !== 2 || !parts.every(s => /^-?\d{1,3}(?:\.\d{1,8})?$/.test(s))) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < 124 || lng > 132 || lat < 32 || lat > 40) return null;
  return { lng, lat };
}

function failed(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status, headers: NO_STORE });
}

function rateLimited(request: NextRequest): boolean {
  // Per-instance guard only. Configure shared edge/WAF rate limiting when
  // enabling paid API usage in production.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ip = forwarded.slice(0, 70);
  const now = Date.now();
  if (attempts.size > 500) {
    for (const [key, entry] of attempts) if (now - entry.start > WINDOW_MS) attempts.delete(key);
  }
  const current = attempts.get(ip);
  if (!current || now - current.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

export async function GET(request: NextRequest) {
  const origin = parsePoint(request.nextUrl.searchParams.get('origin'));
  const destination = parsePoint(request.nextUrl.searchParams.get('destination'));
  const priority = request.nextUrl.searchParams.get('priority') || 'RECOMMEND';
  if (!origin || !destination || !['RECOMMEND', 'TIME', 'DISTANCE'].includes(priority)) {
    return failed(400, 'INVALID_ROUTE_INPUT', '유효한 국내 출발지·목적지 좌표와 경로 유형을 입력해 주세요.');
  }
  if (Math.abs(origin.lat - destination.lat) < 0.00001 && Math.abs(origin.lng - destination.lng) < 0.00001) {
    return failed(400, 'SAME_LOCATION', '출발지와 목적지는 서로 달라야 합니다.');
  }

  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return failed(503, 'KAKAO_ROUTE_NOT_CONFIGURED', '카카오 공식 경로 조회가 설정되지 않았습니다. 내비 앱 연결은 별도로 이용할 수 있습니다.');
  if (rateLimited(request)) return failed(429, 'RATE_LIMITED', '경로 요청이 너무 많습니다. 잠시 후 다시 요청해 주세요.');

  const query = new URLSearchParams({
    origin: origin.lng + ',' + origin.lat,
    destination: destination.lng + ',' + destination.lat,
    priority,
    summary: 'false',
    alternatives: 'true',
  });
  const url = 'https://apis-navi.kakaomobility.com/v1/directions?' + query.toString();

  try {
    const response = await fetch(url, {
      headers: { Authorization: 'KakaoAK ' + key, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (response.status === 429) return failed(429, 'KAKAO_QUOTA', '공식 경로 API 이용량 한도에 도달했습니다.');
    if (response.status === 401 || response.status === 403) return failed(503, 'KAKAO_CREDENTIALS', '카카오 길찾기 API 인증 또는 권한 확인이 필요합니다.');
    if (!response.ok) return failed(502, 'KAKAO_UPSTREAM', '카카오 경로 조회 서버가 응답하지 않았습니다.');

    const raw: unknown = await response.json();
    const payload = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const routes = Array.isArray(payload.routes) ? payload.routes : [];
    const result = routes.filter((candidate: unknown) => {
      if (!candidate || typeof candidate !== 'object') return false;
      const entry = candidate as Record<string, unknown>;
      return Number(entry.result_code) === 0 && entry.summary && typeof entry.summary === 'object';
    }).slice(0, 3).map((item: unknown, index: number) => {
      const route = item as Record<string, unknown>;
      const summary = route.summary as Record<string, unknown>;
      const fare = summary.fare && typeof summary.fare === 'object' ? summary.fare as Record<string, unknown> : {};
      const distance = Number(summary.distance);
      const duration = Number(summary.duration);
      return {
        index,
        distanceMeters: Number.isFinite(distance) && distance >= 0 ? Math.round(distance) : null,
        durationSeconds: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
        tollWon: Number.isFinite(Number(fare.toll)) ? Math.max(0, Math.round(Number(fare.toll))) : null,
        ...routeDetails(route),
      };
    }).filter((route: { distanceMeters: number | null; durationSeconds: number | null }) =>
      route.distanceMeters !== null && route.durationSeconds !== null);

    if (!result.length) return failed(422, 'NO_OFFICIAL_ROUTE', '공식 도로 경로를 찾지 못했습니다. 목적지를 다시 선택해 주세요.');
    return NextResponse.json({
      ok: true,
      provider: 'Kakao Mobility Directions API',
      priority,
      routes: result,
      fetchedAt: new Date().toISOString(),
      liveGuidance: false,
    }, { headers: NO_STORE });
  } catch {
    // No external error body, headers, coordinates or keys are copied into logs.
    return failed(504, 'KAKAO_TIMEOUT', '경로 요청 시간이 초과됐습니다. 카카오내비 앱 안내를 이용해 주세요.');
  }
}
