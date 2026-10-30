import { SAMPLE_PLACES } from '@/lib/places-catalog';

export type StayPoi = {
  id: string;
  name: string;
  kind: string;
  city: string;
  lat: number;
  lng: number;
  why: string;
  href?: string;
  km: number;
  travel: string;
};

export type StayItinerary = { time: string; title: string; body: string };
export type StayTransit = { label: string; body: string };

type Landmark = {
  id: string;
  name: string;
  kind: string;
  city: string;
  lat: number;
  lng: number;
  why: string;
  href?: string;
};

const LANDMARKS: Landmark[] = [
  { id: 'gongdeok-stn', name: '공덕역', kind: '지하철', city: '서울', lat: 37.54324, lng: 126.95148, why: '5·6호선·공항철도·경의중앙선이 모이는 환승역' },
  { id: 'mapo-stn', name: '마포역', kind: '지하철', city: '서울', lat: 37.53972, lng: 126.94583, why: '5호선, 마포대로 숙소와 도보권' },
  { id: 'hongdae-stn', name: '홍대입구역', kind: '거리', city: '서울', lat: 37.55719, lng: 126.92458, why: '카페·야간 거리, 공항철도로 숙소와 한 정거장권' },
  { id: 'yeonnam', name: '연남동 경의선숲길', kind: '산책', city: '서울', lat: 37.5624, lng: 126.9254, why: '홍대에서 이어지는 저녁 산책 코스' },
  { id: 'mangwon-hangang', name: '망원한강공원', kind: '한강', city: '서울', lat: 37.5558, lng: 126.8963, why: '자전거·피크닉, 마포 숙소에서 가까운 한강' },
  { id: 'yeouido', name: '여의도한강공원', kind: '한강', city: '서울', lat: 37.5285, lng: 126.934, why: '마포대교 남단, 노을·자전거' },
  { id: 'gyeongbokgung', name: '경복궁', kind: '문화유산', city: '서울', lat: 37.5796, lng: 126.977, why: '광화문·북촌과 같은 날 묶기', href: '/place/sample-gyeongbokgung' },
  { id: 'bukchon', name: '북촌한옥마을', kind: '마을', city: '서울', lat: 37.5826, lng: 126.9831, why: '한옥 골목 산책', href: '/place/sample-bukchon' },
  { id: 'namsan', name: '남산서울타워', kind: '전망', city: '서울', lat: 37.5512, lng: 126.9882, why: '도심 야경', href: '/place/sample-namsan' },
  { id: 'myeongdong', name: '명동', kind: '쇼핑', city: '서울', lat: 37.5636, lng: 126.983, why: '시내 쇼핑·남산 접근' },
  { id: 'gangnam-stn', name: '강남역', kind: '지하철', city: '서울', lat: 37.4979, lng: 127.0276, why: '2·신분당선, 강남 업무·쇼핑' },
  { id: 'haeundae', name: '해운대해수욕장', kind: '해변', city: '부산', lat: 35.1586, lng: 129.1604, why: '해변 산책과 오션뷰', href: '/place/sample-haeundae' },
  { id: 'gwangalli', name: '광안리해수욕장', kind: '해변', city: '부산', lat: 35.1532, lng: 129.1186, why: '광안대교 야경', href: '/place/sample-gwangalli' },
  { id: 'seongsan', name: '성산일출봉', kind: '자연', city: '제주', lat: 33.458, lng: 126.942, why: '일출·둘레길', href: '/place/sample-seongsan' },
  { id: 'seongsan-ilchulbong', name: '성산일출봉', kind: '자연', city: '제주', lat: 33.4581, lng: 126.9425, why: '일출 명소', href: '/place/sample-seongsan' },
  { id: 'jeju-city', name: '제주동문시장', kind: '시장', city: '제주', lat: 33.5125, lng: 126.528, why: '제주시내 저녁 식사' },
  { id: 'bulguksa', name: '불국사', kind: '문화유산', city: '경주', lat: 35.79, lng: 129.332, why: '석굴암과 같은 날 동선' },
  { id: 'hwangnidan', name: '황리단길', kind: '거리', city: '경주', lat: 35.837, lng: 129.209, why: '카페·한옥 골목' },
  { id: 'jeonju-hanok', name: '전주한옥마을', kind: '마을', city: '전주', lat: 35.8154, lng: 127.153, why: '한옥 골목과 음식' },
  { id: 'namisum', name: '남이섬', kind: '자연', city: '가평', lat: 37.791, lng: 127.5256, why: '선착장에서 도보 이동' },
  { id: 'gapyeong-stn', name: '가평역', kind: '지하철', city: '가평', lat: 37.8145, lng: 127.5107, why: '경춘선, 남이섬·아침고요 접근' },
  { id: 'sokcho-beach', name: '속초해수욕장', kind: '해변', city: '속초', lat: 38.1905, lng: 128.6038, why: '중앙시장과 이어서 걷기' },
  { id: 'seorak', name: '설악산 소공원', kind: '자연', city: '속초', lat: 38.1646, lng: 128.519, why: '케이블카·울산바위 들머리' },
  { id: 'gangneung-gyeongpo', name: '경포해변', kind: '해변', city: '강릉', lat: 37.805, lng: 128.908, why: '안목·중앙시장과 묶는 동선' },
  { id: 'jeongdongjin', name: '정동진', kind: '일출', city: '강릉', lat: 37.691, lng: 129.032, why: '기차역과 해변이 붙어 있는 일출 포인트' },
];

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function travelLabel(km: number) {
  const walk = Math.max(1, Math.round((km * 1000) / 80));
  if (walk <= 18) return `도보 ${walk}분`;
  const bus = Math.max(12, Math.round(km * 6 + 8));
  return `대중교통 약 ${bus}분 · ${km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`}`;
}

function catalogLandmarks(): Landmark[] {
  const extras: Landmark[] = SAMPLE_PLACES.filter((p) => p.lat != null && p.lng != null).map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.category,
    city: p.city,
    lat: Number(p.lat),
    lng: Number(p.lng),
    why: p.overview.split('.')[0] + '.',
    href: `/place/${p.id}`,
  }));
  const seen = new Set<string>();
  const out: Landmark[] = [];
  for (const item of [...LANDMARKS, ...extras]) {
    const key = `${item.city}:${item.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function nearbyPois(input: { city?: string; lat?: number | null; lng?: number | null }, limit = 5): StayPoi[] {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const city = String(input.city || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return catalogLandmarks()
    .map((item) => {
      const km = haversineKm(lat, lng, item.lat, item.lng);
      return { ...item, km, travel: travelLabel(km) };
    })
    .filter((item) => item.km <= 25 && (item.city === city || item.km <= 8))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export function buildItinerary(neighborhood: string, city: string, pois: StayPoi[]): StayItinerary[] {
  const first = pois[0];
  const second = pois[1];
  const third = pois[2];
  return [
    {
      time: '도착',
      title: `${neighborhood || city} 체크인`,
      body: first ? `가까운 거점은 ${first.name}입니다. ${first.travel}.` : `${city} 시내에서 숙소를 거점으로 씁니다.`,
    },
    {
      time: '오후',
      title: second ? `${second.name}` : `${city} 둘러보기`,
      body: second ? `${second.why} ${second.travel}.` : '숙소 주변 골목과 카페를 먼저 걷는 편이 덜 지칩니다.',
    },
    {
      time: '저녁',
      title: third ? third.name : first ? first.name : '숙소 근처 저녁',
      body: third ? `${third.why}` : '저녁은 숙소에서 가까운 식당·카페로 짧게 잡는 것이 편합니다.',
    },
  ];
}

export function buildTransit(pois: StayPoi[], neighborhood: string, city: string): StayTransit[] {
  const station = pois.find((p) => p.kind === '지하철') || pois[0];
  const out: StayTransit[] = [];
  if (station) {
    out.push({ label: '가장 가까운 거점', body: `${station.name} · ${station.travel}` });
  }
  if (neighborhood === '마포' || neighborhood === '홍대·합정') {
    out.push({ label: '공항', body: '공항철도 공덕·홍대입구로 인천공항과 환승 없이 이어집니다.' });
  } else if (city === '제주') {
    out.push({ label: '공항', body: '제주공항에서 시내·동부 숙소까지는 버스 또는 렌터가 일반적입니다.' });
  } else if (city === '부산') {
    out.push({ label: '철도', body: '부산역·센텀에서 해운대·광안리로 이어집니다.' });
  }
  out.push({ label: '길찾기', body: '페이지 지도에서 내 위치를 허용하면 구글 지도 도보 안내를 엽니다.' });
  return out.slice(0, 3);
}
