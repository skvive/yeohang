export const AGODA_CID = (process.env.AGODA_CID || '').trim();
export const AGODA_SITE_ID = (process.env.AGODA_SITE_ID || AGODA_CID).trim();
export const AGODA_API_KEY = (process.env.AGODA_API_KEY || '').trim();
export const AGODA_LITE_URL = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

export function hasAgodaAffiliate(): boolean {
  return Boolean(AGODA_CID);
}

export function agodaDeepLink(hotelId: string | number, extra: { checkIn?: string; checkOut?: string; adults?: number; rooms?: number } = {}) {
  const cid = AGODA_CID;
  const params = new URLSearchParams({
    hid: String(hotelId),
    currency: 'KRW',
    locale: 'ko-kr',
    NumberofAdults: String(extra.adults || 2),
    NumberofChildren: '0',
    Rooms: String(extra.rooms || 1),
  });
  if (cid) params.set('cid', cid);
  if (extra.checkIn) params.set('checkin', extra.checkIn);
  if (extra.checkOut) params.set('checkout', extra.checkOut);
  return `https://www.agoda.com/partners/partnersearch.aspx?${params.toString()}`;
}

export function agodaBookUrl(p: { affiliate_url?: string | null; book_url?: string | null; agoda_hotel_id?: number | string | null }) {
  const existing = String(p.affiliate_url || p.book_url || '').trim();
  if (existing) return existing;
  if (p.agoda_hotel_id != null && String(p.agoda_hotel_id) !== '') return agodaDeepLink(p.agoda_hotel_id);
  return '';
}

export function mapAgodaCategory(raw: string) {
  const t = raw.toLowerCase();
  if (/hanok|한옥|traditional korean/.test(t)) return '한옥';
  if (/resort|리조트/.test(t)) return '리조트';
  if (/camp|glamp|캠핑|글램핑/.test(t)) return '캠핑·글램핑';
  if (/guest|hostel|호스텔|게스트/.test(t)) return '게스트하우스';
  if (/pension|villa|motel|homestay|펜션|풀빌라/.test(t)) return '펜션·풀빌라';
  if (/hotel|호텔/.test(t)) return '호텔';
  return '호텔';
}

export function isKoreaRow(row: Record<string, string>) {
  const blob = [row.countryiso, row.countryiso2, row.country_iso, row.countrycode, row.country_code, row.countryname, row.country_name, row.country]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\bkr\b|\bkor\b|south korea|korea, republic|대한민국|한국/.test(blob) && !/north korea|dprk|북한/.test(blob);
}
