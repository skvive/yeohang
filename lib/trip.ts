export const TRIP_ALLIANCE_ID = (process.env.TRIP_ALLIANCE_ID || process.env.NEXT_PUBLIC_TRIP_ALLIANCE_ID || '').trim();
export const TRIP_SID = (process.env.TRIP_SID || process.env.NEXT_PUBLIC_TRIP_SID || '').trim();

export function hasTripAffiliate() {
  return Boolean(TRIP_ALLIANCE_ID && TRIP_SID);
}

function withTracking(url: URL) {
  if (TRIP_ALLIANCE_ID) url.searchParams.set('allianceid', TRIP_ALLIANCE_ID);
  if (TRIP_SID) url.searchParams.set('sid', TRIP_SID);
  return url.toString();
}

export function tripDeepLink(hotelId: string | number) {
  const url = new URL('https://kr.trip.com/hotels/detail/');
  url.searchParams.set('hotelId', String(hotelId));
  url.searchParams.set('locale', 'ko-KR');
  url.searchParams.set('curr', 'KRW');
  return withTracking(url);
}

export function tripSearchLink(name: string, city = '') {
  const q = [name, city].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  const url = new URL('https://kr.trip.com/hotels/list');
  url.searchParams.set('locale', 'ko-KR');
  url.searchParams.set('curr', 'KRW');
  if (q) url.searchParams.set('keyword', q);
  return withTracking(url);
}

export function tripBookUrl(p: {
  trip_hotel_id?: number | string | null;
  trip_url?: string | null;
  name?: string | null;
  city?: string | null;
}) {
  const existing = String(p.trip_url || '').trim();
  if (existing) return existing;
  if (p.trip_hotel_id != null && String(p.trip_hotel_id) !== '') return tripDeepLink(p.trip_hotel_id);
  if (p.name) return tripSearchLink(String(p.name), String(p.city || ''));
  return '';
}
