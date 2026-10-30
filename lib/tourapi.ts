/**
 * 한국관광공사 TourAPI 4.0 (KorService2) — 공공데이터포털 공식 엔드포인트만 사용.
 * 문서: https://www.data.go.kr/data/15101578/openapi.do
 */
const BASE = 'https://apis.data.go.kr/B551011/KorService2';

export const TOUR_AREA: Record<string, number> = {
  서울: 1,
  인천: 2,
  대전: 3,
  대구: 4,
  광주: 5,
  부산: 6,
  울산: 7,
  세종: 8,
  경기: 31,
  가평: 31,
  평창: 32,
  강원: 32,
  속초: 32,
  강릉: 32,
  고성: 32,
  충북: 33,
  충남: 34,
  경북: 35,
  경주: 35,
  경남: 36,
  전북: 37,
  전주: 37,
  전남: 38,
  제주: 39,
};

export function tourApiKey() {
  return (
    process.env.TOUR_API_KEY ||
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.KTO_SERVICE_KEY ||
    ''
  ).trim();
}

export function tourApiConfigured() {
  return Boolean(tourApiKey());
}

type TourItem = Record<string, unknown>;

function itemsOf(doc: unknown): TourItem[] {
  const body = (doc as { response?: { body?: { items?: { item?: TourItem | TourItem[] } } } })?.response?.body?.items?.item;
  if (!body) return [];
  return Array.isArray(body) ? body : [body];
}

async function tourGet(op: string, extra: Record<string, string | number>) {
  const key = tourApiKey();
  if (!key) throw new Error('TourAPI 키가 없습니다. TOUR_API_KEY 또는 DATA_GO_KR_SERVICE_KEY를 설정하세요.');
  const q = new URLSearchParams({
    serviceKey: key,
    MobileOS: 'ETC',
    MobileApp: 'YEOHANG',
    _type: 'json',
  });
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  const r = await fetch(`${BASE}/${op}?${q}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`TourAPI ${op} ${r.status}`);
  return itemsOf(await r.json());
}

export async function listByArea(city: string, rows = 20) {
  const areaCode = TOUR_AREA[city];
  if (!areaCode) return [];
  return tourGet('areaBasedList2', {
    areaCode,
    contentTypeId: 12,
    numOfRows: rows,
    pageNo: 1,
    arrange: 'Q',
  });
}

export async function detailCommon(contentId: string) {
  const rows = await tourGet('detailCommon2', {
    contentId,
    defaultYN: 'Y',
    firstImageYN: 'Y',
    areacodeYN: 'Y',
    addrinfoYN: 'Y',
    mapinfoYN: 'Y',
    overviewYN: 'Y',
  });
  return rows[0] || null;
}

export function mapTourItem(item: TourItem, cityHint = '') {
  const contentId = String(item.contentid || item.contentId || '');
  const name = String(item.title || '').trim();
  const addr = String(item.addr1 || '');
  const city =
    cityHint ||
    Object.keys(TOUR_AREA).find((c) => addr.includes(c) || String(item.addr1 || '').includes(c)) ||
    '';
  return {
    id: contentId ? `tourapi-${contentId}` : '',
    content_id: contentId,
    name,
    city,
    area: String(item.addr2 || item.sigungucode || '').slice(0, 40),
    category: '관광지',
    address: addr,
    overview: String(item.overview || '').slice(0, 1200),
    tel: String(item.tel || ''),
    homepage: String(item.homepage || '').replace(/<[^>]+>/g, '').slice(0, 300),
    lat: item.mapy ? Number(item.mapy) : null,
    lng: item.mapx ? Number(item.mapx) : null,
    image_url: String(item.firstimage || item.firstimage2 || ''),
    source: 'tourapi' as const,
  };
}
