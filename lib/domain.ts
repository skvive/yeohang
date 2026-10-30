export const DEMO_MODE = process.env.DEMO_MODE !== '0';
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://yeohang.lexid.site').replace(/\/$/, '');

export const PRICES = {
  starter: { name: '기본 광고', amount: 59000, interval: 'month', features: ['숙소 기본 노출', '블로그 연결', '월간 조회 리포트'] },
  growth: { name: '성장 프리미엄', amount: 149000, interval: 'month', features: ['스폰서 검색 카드', '인공지능 추천 후보 우선 검토', '쿠폰·영상 큐레이션', '전환 리포트'] },
  signature: { name: '대표 파트너', amount: 349000, interval: 'month', features: ['프리미엄 스폰서 영역', '브랜드 마키 슬롯', '상담 리드 대시보드', '우선 지원'] },
  'content-pack': { name: '콘텐츠 세팅 패키지', amount: 290000, interval: null, features: ['블로그 구성 지원', '이미지 권리 검수', '검색 기본 메타데이터'] },
};

export const CATEGORY_SLUGS: Record<string, string> = {
  hotel: '호텔',
  resort: '리조트',
  pension: '펜션·풀빌라',
  hanok: '한옥',
  guesthouse: '게스트하우스',
  camping: '캠핑·글램핑',
};

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.GOOGLE_ADMIN_EMAILS || '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type Property = Record<string, unknown> & {
  id: string;
  name: string;
  city: string;
  area: string;
  category?: string;
  address?: string;
  tagline?: string;
  description?: string;
  source_url?: string;
  photo_url?: string;
  photo_license?: string;
  photo_author?: string;
  photo_credit?: string;
  sponsored: boolean;
  verified: boolean;
  active: boolean;
  public_record: boolean;
  partner_verified: boolean;
  price: number | null;
  amenities: string[];
  image_url: string;
  lat: number | null;
  lng: number | null;
  source?: string;
  affiliate_url?: string;
  agoda_hotel_id?: number | null;
  book_url?: string;
};

const CITY_KO: Record<string, string> = {
  seoul: '서울',
  busan: '부산',
  pusan: '부산',
  jeju: '제주',
  'jeju island': '제주',
  'jeju-si': '제주',
  seogwipo: '서귀포',
  incheon: '인천',
  daegu: '대구',
  daejeon: '대전',
  gwangju: '광주',
  ulsan: '울산',
  suwon: '수원',
  gyeongju: '경주',
  jeonju: '전주',
  gapyeong: '가평',
  pyeongchang: '평창',
  sokcho: '속초',
  goseong: '고성',
  gangneung: '강릉',
  yeosu: '여수',
  tongyeong: '통영',
  chuncheon: '춘천',
  wonju: '원주',
  andong: '안동',
  pohang: '포항',
  changwon: '창원',
  gimhae: '김해',
  paju: '파주',
  goyang: '고양',
  yongin: '용인',
  seongnam: '성남',
  bucheon: '부천',
  cheonan: '천안',
  cheongju: '청주',
  mokpo: '목포',
  gimpo: '김포',
  icheon: '이천',
  namyangju: '남양주',
  yangpyeong: '양평',
  hongcheon: '홍천',
  jeongseon: '정선',
  taebaek: '태백',
  samcheok: '삼척',
  donghae: '동해',
  yangyang: '양양',
  inje: '인제',
  geoje: '거제',
  namhae: '남해',
  hadong: '하동',
  suncheon: '순천',
  gurye: '구례',
  boseong: '보성',
  wando: '완도',
  jindo: '진도',
  naju: '나주',
  iksan: '익산',
  gunsan: '군산',
  namwon: '남원',
  muju: '무주',
  damyang: '담양',
  yeongju: '영주',
  boryeong: '보령',
  gongju: '공주',
  asan: '아산',
  jecheon: '제천',
  chungju: '충주',
  jeongeup: '정읍',
  gumi: '구미',
  gyeongsan: '경산',
  yangsan: '양산',
  'gangnam-gu': '강남구',
  myeongdong: '명동',
  hongdae: '홍대',
};

export function cityKo(raw: string) {
  const t = String(raw || '').trim();
  if (!t) return t;
  if (/[가-힣]/.test(t) && !/[A-Za-z]/.test(t)) return t;
  const key = t.toLowerCase().replace(/\s+/g, ' ');
  if (CITY_KO[key]) return CITY_KO[key];
  for (const [en, ko] of Object.entries(CITY_KO)) {
    if (key.includes(en)) return ko;
  }
  return t;
}

function latinOnly(s: string) {
  return /[A-Za-z]/.test(s) && !/[가-힣]/.test(s);
}

const GU_KO: Record<string, string> = {
  'jongno-gu': '종로구',
  'jung-gu': '중구',
  'yongsan-gu': '용산구',
  'seongdong-gu': '성동구',
  'gwangjin-gu': '광진구',
  'dongdaemun-gu': '동대문구',
  'jungnang-gu': '중랑구',
  'seongbuk-gu': '성북구',
  'gangbuk-gu': '강북구',
  'dobong-gu': '도봉구',
  'nowon-gu': '노원구',
  'eunpyeong-gu': '은평구',
  'seodaemun-gu': '서대문구',
  'mapo-gu': '마포구',
  'yangcheon-gu': '양천구',
  'gangseo-gu': '강서구',
  'guro-gu': '구로구',
  'geumcheon-gu': '금천구',
  'yeongdeungpo-gu': '영등포구',
  'dongjak-gu': '동작구',
  'gwanak-gu': '관악구',
  'seocho-gu': '서초구',
  'gangnam-gu': '강남구',
  'songpa-gu': '송파구',
  'gangdong-gu': '강동구',
  'haeundae-gu': '해운대구',
  'suyeong-gu': '수영구',
  'nam-gu': '남구',
  'buk-gu': '북구',
  'seo-gu': '서구',
  'dong-gu': '동구',
  'myeongdong': '명동',
};

function addressKo(raw: string) {
  let s = String(raw || '').trim();
  if (!s) return s;
  s = s.replace(/,?\s*South Korea\b/gi, '');
  s = s.replace(/,?\s*Republic of Korea\b/gi, '');
  const dict = { ...CITY_KO, ...GU_KO };
  for (const en of Object.keys(dict).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[- ]?')}\\b`, 'gi');
    s = s.replace(re, dict[en]);
  }
  s = s.replace(/\b(\d+)\s*ga\b/gi, '$1가');
  return s.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/,\s*$/, '').trim();
}

function tidyKoDesc(s: string) {
  return s.replace(/([가-힣])은\/는/g, (_, c) => {
    const jong = (c.charCodeAt(0) - 0xac00) % 28;
    return c + (jong ? '은' : '는');
  }).replace(/은\/는/g, '는');
}

function koAmenityToken(raw: string) {
  const t = raw.trim();
  if (!t) return t;
  if (/[가-힣]/.test(t)) return t;
  const x = t.toLowerCase();
  if (/hanok|traditional korean/.test(x)) return '한옥';
  if (/resort/.test(x)) return '리조트';
  if (/camp|glamp/.test(x)) return '캠핑·글램핑';
  if (/guest|hostel/.test(x)) return '게스트하우스';
  if (/serviced apartment|apartment|condo/.test(x)) return '아파트';
  if (/pension|villa|motel|homestay|inn/.test(x)) return '펜션·풀빌라';
  if (/boutique/.test(x)) return '부티크 호텔';
  if (/hotel/.test(x)) return '호텔';
  if (/wifi|wi-fi/.test(x)) return '와이파이';
  if (/park/.test(x)) return '주차';
  if (/pool|swim/.test(x)) return '수영장';
  if (/breakfast/.test(x)) return '조식';
  if (/spa/.test(x)) return '스파';
  if (/gym|fitness/.test(x)) return '피트니스';
  if (/pet/.test(x)) return '반려동물';
  if (/ocean|sea view/.test(x)) return '오션뷰';
  return t;
}

export function mapProperty(row: Record<string, unknown>): Property {
  const amenities = String(row.amenities || '');
  const image = Number(row.image || 1);
  const publicRecord = Boolean(row.public_record);
  const category = koAmenityToken(String(row.category || '')) || String(row.category || '');
  const city = cityKo(String(row.city || ''));
  const area = cityKo(String(row.area || '')) || city;
  const taglineRaw = String(row.tagline || '');
  const author = String(row.photo_author || '');
  const license = String(row.photo_license || '');
  const desc = String(row.description || '');
  const name = String(row.name || '');
  return {
    ...row,
    id: String(row.id),
    name,
    city,
    area,
    category,
    address: addressKo(String(row.address || '')),
    tagline: latinOnly(taglineRaw) ? [city, category].filter(Boolean).join(' · ') || '아고다 제휴 숙소' : taglineRaw,
    description: latinOnly(desc)
      ? `${city}에 있는 ${category || '숙소'}입니다. 상세 안내는 아고다에서 확인하세요.`
      : tidyKoDesc(desc),
    source_url: String(row.source_url || ''),
    photo_url: String(row.photo_url || ''),
    photo_license: /agoda affiliate/i.test(license) ? '아고다 제휴 콘텐츠' : license,
    photo_author: /^agoda$/i.test(author) ? '아고다' : author,
    photo_credit: String(row.photo_credit || ''),
    sponsored: Boolean(row.sponsored),
    verified: Boolean(row.verified),
    active: Boolean(row.active),
    public_record: publicRecord,
    partner_verified: Boolean(row.partner_verified),
    price: publicRecord || String(row.source || '') === 'agoda' ? null : row.price == null ? null : Number(row.price),
    amenities: amenities ? amenities.split(',').map(koAmenityToken).filter(Boolean) : [],
    image_url: `/assets/listing-${image}.webp`,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    source: String(row.source || (publicRecord ? 'public' : 'seed')),
    affiliate_url: String(row.affiliate_url || ''),
    agoda_hotel_id: row.agoda_hotel_id == null ? null : Number(row.agoda_hotel_id),
    book_url: String(row.affiliate_url || ''),
  };
}

export function extractSearch(q: string) {
  const t = q.toLowerCase();
  const city = ['서울', '부산', '제주', '강릉', '가평', '경주', '전주', '평창', '속초', '고성'].find((c) => t.includes(c)) || '';
  const amenities = ['수영장', '조식', '오션뷰', '주차', '와이파이', '풀빌라', '반려동물', '가족', '커플', '루프탑'].filter((x) => t.includes(x));
  let max_price: number | null = null;
  const m = t.match(/(\d{1,3})\s*만원/);
  if (m && ['이하', '안쪽', '미만', '까지', '이내', '언더'].some((x) => t.includes(x))) max_price = Number(m[1]) * 10000;
  const m2 = t.match(/([\d,]{5,})\s*원/);
  if (m2 && ['이하', '미만', '이내', '까지'].some((x) => t.includes(x))) max_price = Number(m2[1].replace(/,/g, ''));
  return { city, amenities, max_price };
}

export function haversine(a: number, b: number, c: number, d: number) {
  const R = 6371;
  const p = Math.PI / 180;
  const x = 0.5 - Math.cos((c - a) * p) / 2 + (Math.cos(a * p) * Math.cos(c * p) * (1 - Math.cos((d - b) * p))) / 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function seoulToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

export function weeklyWindow(instant = new Date()) {
  const local = new Date(instant.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = local.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(local);
  monday.setDate(local.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = monday.toISOString().slice(0, 10);
  const y = monday.getFullYear();
  const onejan = new Date(y, 0, 1);
  const week = Math.ceil(((monday.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return {
    campaign_id: `weekly-${y}-W${String(week).padStart(2, '0')}`,
    starts_on: iso,
    ends_on: sunday.toISOString().slice(0, 10),
    iso_week: `${y}-W${String(week).padStart(2, '0')}`,
    next_refresh: `${sunday.toISOString().slice(0, 10)} 00:00 KST`,
  };
}

export function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function safeHttps(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}
