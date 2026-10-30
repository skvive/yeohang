export const DEMO_MODE = process.env.DEMO_MODE !== '0';
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://yeohang.lexid.site').replace(/\/$/, '');

export const PRICES = {
  starter: { name: '스타터 광고', amount: 59000, interval: 'month', features: ['숙소 기본 노출', '블로그 연결', '월간 조회 리포트'] },
  growth: { name: '그로스 프리미엄', amount: 149000, interval: 'month', features: ['스폰서 검색 카드', 'AI 추천 후보 우선 검토', '쿠폰·영상 큐레이션', '전환 리포트'] },
  signature: { name: '시그니처 파트너', amount: 349000, interval: 'month', features: ['프리미엄 스폰서 영역', '브랜드 마키 슬롯', '상담 리드 대시보드', '우선 지원'] },
  'content-pack': { name: '콘텐츠 세팅 패키지', amount: 290000, interval: null, features: ['블로그 구성 지원', '이미지 권리 검수', 'SEO 기본 메타데이터'] },
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
};

export function mapProperty(row: Record<string, unknown>): Property {
  const amenities = String(row.amenities || '');
  const image = Number(row.image || 1);
  const publicRecord = Boolean(row.public_record);
  return {
    ...row,
    id: String(row.id),
    name: String(row.name || ''),
    city: String(row.city || ''),
    area: String(row.area || ''),
    category: String(row.category || ''),
    address: String(row.address || ''),
    tagline: String(row.tagline || ''),
    description: String(row.description || ''),
    source_url: String(row.source_url || ''),
    photo_url: String(row.photo_url || ''),
    photo_license: String(row.photo_license || ''),
    photo_author: String(row.photo_author || ''),
    photo_credit: String(row.photo_credit || ''),
    sponsored: Boolean(row.sponsored),
    verified: Boolean(row.verified),
    active: Boolean(row.active),
    public_record: publicRecord,
    partner_verified: Boolean(row.partner_verified),
    price: publicRecord ? null : row.price == null ? null : Number(row.price),
    amenities: amenities ? amenities.split(',') : [],
    image_url: `/assets/listing-${image}.webp`,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
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
