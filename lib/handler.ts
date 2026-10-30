import { auth } from '@/lib/auth/server';
import { dbQuery, dbTx } from '@/lib/db';
import {
  CATEGORY_SLUGS,
  DEMO_MODE,
  LIST_COLUMNS,
  PRICES,
  adminEmails,
  emailOk,
  extractSearch,
  haversine,
  listProperty,
  mapProperty,
  seoulToday,
  weeklyWindow,
} from '@/lib/domain';
import { agodaBookUrl } from '@/lib/agoda';
import { hasTripAffiliate } from '@/lib/trip';
import {
  DEAL_AMOUNT_KRW,
  DEAL_COOKIE,
  DEAL_HOURS,
  DEAL_MIN_SPEND_KRW,
  characterForSource,
  dealCookieHeader,
  dealExpiresAt,
  dealPolicy,
  publicDeal,
  readCookie,
} from '@/lib/deal';
import { maskEmail, sha256, tokenHex, tokenUrl, uuid } from '@/lib/hash';

type SessionUser = { email: string; admin: boolean };

async function identity(): Promise<SessionUser | null> {
  try {
    const { data } = await auth.getSession();
    const email = data?.user?.email?.toLowerCase();
    if (!email) return null;
    return { email, admin: adminEmails().has(email) };
  } catch {
    return null;
  }
}

const CDN_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';
const PUBLIC_GET = new Set([
  '/health',
  '/agoda/status',
  '/prices',
  '/catalog/categories',
  '/photos/search',
  '/map',
  '/properties',
  '/search',
  '/coupons',
  '/weekly',
  '/promos',
  '/home',
  '/deals',
]);

function json(data: unknown, status = 200, cache = 'no-store') {
  return Response.json(data, { status, headers: { 'Cache-Control': cache } });
}
function jsonCookie(data: unknown, cookie: string, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie,
    },
  });
}

async function expireTimeDeals() {
  try {
    await dbQuery(
      `UPDATE time_deals SET status='expired' WHERE status IN ('active','clicked') AND expires_at <= NOW()`,
    );
  } catch {
    /* table may not exist yet */
  }
}
function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

let activeCountCache = { n: 0, t: 0 };
async function countActiveCached() {
  if (activeCountCache.n && Date.now() - activeCountCache.t < 120_000) return activeCountCache.n;
  const n = Number((await dbQuery(`SELECT COUNT(*)::int AS n FROM properties WHERE active=true`))[0]?.n || 0);
  activeCountCache = { n, t: Date.now() };
  return n;
}

function visibleCampaign(row: Record<string, unknown>) {
  const status = String(row.status);
  const funding = Boolean(row.funding_approved);
  return {
    ...row,
    status,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    funding_approved: funding,
    demo_only: status === 'demo',
    claimable: (status === 'demo' && DEMO_MODE) || (status === 'active' && funding),
    slots_available: Number(row.total_claims) > 0 ? Math.max(0, Number(row.total_claims) - Number(row.claimed_count)) : null,
    verified_benefit: status === 'active' && funding,
  };
}

function discountFor(c: Record<string, unknown>, amount: number) {
  let v = String(c.discount_kind) === 'fixed' ? Number(c.discount_value) : Math.floor((amount * Number(c.discount_value)) / 100);
  const cap = Number(c.cap_krw);
  if (cap) v = Math.min(v, cap);
  return Math.max(0, Math.min(v, amount));
}

function checkEligibility(c: Record<string, unknown>, amount: number, nights: number, city = '', propertyId = '', checkin = '') {
  if (!['demo', 'active'].includes(String(c.status))) return '진행하지 않는 행사입니다.';
  const today = seoulToday();
  if (!(String(c.valid_from) <= today && today <= String(c.valid_until))) return '행사 발급 기간이 아닙니다.';
  if (Number(c.total_claims) > 0 && Number(c.claimed_count) >= Number(c.total_claims)) return '발급 수량이 종료되었습니다.';
  if (amount < Number(c.min_spend)) return `예시 결제액 ${Number(c.min_spend).toLocaleString('ko-KR')}원 이상 조건입니다.`;
  if (nights < Number(c.min_nights)) return `${c.min_nights}박 이상 조건입니다.`;
  if (c.city && c.city !== city) return '해당 지역에만 적용됩니다.';
  if (c.property_id && c.property_id !== propertyId) return '해당 숙소에만 적용됩니다.';
  if (c.campaign_type === 'weekday' && checkin) {
    const d = new Date(checkin + 'T12:00:00+09:00');
    const day = d.getDay();
    if (day === 0 || day === 6) return '평일 체크인에만 적용됩니다.';
  }
  return '';
}

async function ensureWeekly() {
  const window = weeklyWindow();
  const existing = await dbQuery(`SELECT status, funding_approved, claimed_count, total_claims FROM promo_campaigns WHERE id=$1`, [window.campaign_id]);
  if (!existing[0]) {
    await dbQuery(
      `INSERT INTO promo_campaigns (
        id,title,subtitle,campaign_type,city,property_id,discount_kind,discount_value,cap_krw,min_spend,min_nights,
        valid_from,valid_until,total_claims,claimed_count,per_email_limit,status,funded_by,funding_approved,terms_url
      ) VALUES ($1,$2,$3,'weekly','','','fixed',10000,0,100000,1,$4,$5,100,0,1,$6,'시연 기획 · 숙소 할인 재원 미확정',false,'')
      ON CONFLICT (id) DO NOTHING`,
      [window.campaign_id, '이번 주 여행 발견권', '월요일에 새로운 테마로 돌아오는 주간 여행 혜택 · 시연용', window.starts_on, window.ends_on, DEMO_MODE ? 'demo' : 'draft'],
    );
  }
  const row = (await dbQuery(`SELECT status, funding_approved, claimed_count, total_claims FROM promo_campaigns WHERE id=$1`, [window.campaign_id]))[0];
  const approved = await dbQuery(
    `SELECT COUNT(*)::int AS n FROM promo_campaigns c JOIN properties p ON p.id=c.property_id
     WHERE c.campaign_type='weekly' AND c.status='active' AND c.funding_approved=true
     AND p.partner_verified=true AND p.verified=true AND p.active=true
     AND c.valid_from<=$1 AND c.valid_until>=$2`,
    [window.ends_on, window.starts_on],
  );
  return {
    ...window,
    status: row?.status,
    approved_partner_campaigns: approved[0]?.n || 0,
    actual_discount_available: Boolean(approved[0]?.n),
    demo_only: row?.status === 'demo',
    issued_count: row?.claimed_count || 0,
    quota: row?.total_claims || 0,
    notice: '실제 숙박 할인권이 아닙니다. 제휴 숙소 승인 전에는 혜택을 약속하지 않습니다.',
  };
}

async function searchProperties(q = '', city = '', maxPrice: number | null, lat: number | null, lng: number | null, category = '') {
  const filters = q ? extractSearch(q) : { city: '', amenities: [] as string[], max_price: null as number | null };
  city = city || filters.city;
  maxPrice = maxPrice || filters.max_price;
  const clauses = ['active=true'];
  const params: unknown[] = [];
  if (!DEMO_MODE) clauses.push(`(verified=true OR public_record=true OR source='agoda')`);
  if (city) {
    params.push(`%${city}%`);
    clauses.push(`(city ILIKE $${params.length} OR area ILIKE $${params.length} OR name ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    clauses.push(`category = $${params.length}`);
  }
  const keywords = q.toLowerCase().split(/\s+/).filter((x) => x.length > 1).slice(0, 6);
  for (const w of keywords) {
    if (city && w === city.toLowerCase()) continue;
    params.push(`%${w}%`);
    clauses.push(
      `(name ILIKE $${params.length} OR city ILIKE $${params.length} OR area ILIKE $${params.length} OR coalesce(address,'') ILIKE $${params.length} OR coalesce(category,'') ILIKE $${params.length} OR coalesce(tagline,'') ILIKE $${params.length})`,
    );
  }
  const nearby = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  if (nearby) clauses.push('lat IS NOT NULL AND lng IS NOT NULL');
  const where = clauses.join(' AND ');
  const selectParams = [...params];
  let orderSql = 'sponsored DESC, coalesce(review_count,0) DESC, coalesce(review_score,0) DESC, name ASC';
  if (nearby) {
    selectParams.push(lat, lng);
    orderSql = `(lat - $${selectParams.length - 1})^2 + (lng - $${selectParams.length})^2 ASC`;
  }
  const limit = nearby ? 80 : 120;
  selectParams.push(limit);
  const rows = (await dbQuery(`SELECT ${LIST_COLUMNS} FROM properties WHERE ${where} ORDER BY ${orderSql} LIMIT $${selectParams.length}`, selectParams)).map(listProperty);
  const unfiltered = params.length === 0 && !nearby;
  const total = rows.length < limit
    ? rows.length
    : unfiltered
      ? await countActiveCached()
      : rows.length;
  const res: Array<ReturnType<typeof listProperty> & { relevance_score: number; distance_km?: number }> = [];
  for (const p of rows) {
    if (maxPrice && p.source !== 'agoda' && (p.price == null || Number(p.price) > maxPrice)) continue;
    const amen = p.amenities as string[];
    if (filters.amenities.length && !filters.amenities.every((a) => amen.includes(a) || String(p.category).includes(a))) continue;
    const combined = [p.name, p.city, p.area, p.address, p.category, p.tagline, amen.join(',')].join(' ').toLowerCase();
    let score = keywords.reduce((s, x) => s + (combined.includes(x) ? (amen.includes(x) ? 3 : 1) : 0), 0);
    let distance_km: number | undefined;
    if (nearby && p.lat != null && p.lng != null) {
      distance_km = Math.round(haversine(lat as number, lng as number, p.lat, p.lng) * 10) / 10;
      score += Math.max(0, 8 - distance_km * 0.3);
    }
    res.push({ ...p, relevance_score: Math.round(score * 10) / 10, distance_km });
  }
  const sponsored = res.filter((p) => p.sponsored).sort((a, b) => b.relevance_score - a.relevance_score || (a.distance_km || 9999) - (b.distance_km || 9999));
  let organic = res.sort((a, b) => b.relevance_score - a.relevance_score || (a.distance_km || 9999) - (b.distance_km || 9999));
  if (nearby && !q && !city) {
    organic = [...organic].sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
  }
  return {
    sponsored,
    results: organic,
    interpretation: filters,
    engine: q ? 'rules-demo' : 'manual',
    count: total,
    disclosure: '광고 파트너는 스폰서로 구분되며 아고다 제휴 숙소는 아고다에서 요금·예약을 확인합니다.',
  };
}

async function canEdit(user: SessionUser | null, propertyId: string) {
  if (!user) return false;
  if (user.admin) return true;
  const rows = await dbQuery(`SELECT 1 FROM property_partners WHERE property_id=$1 AND google_email=$2`, [propertyId, user.email]);
  return Boolean(rows[0]);
}

export async function handleApi(req: Request, slug: string[]) {
  const path = '/' + slug.join('/');
  const url = new URL(req.url);
  const me = req.method === 'GET' && PUBLIC_GET.has(path) ? null : await identity();

  try {
    if (req.method === 'GET') {
      if (path === '/health') {
        return json({
          ok: true,
          version: '2.0.0',
          google_oauth_configured: Boolean(process.env.NEON_AUTH_BASE_URL),
          stripe_configured: Boolean(process.env.STRIPE_SECRET_KEY),
          ai_configured: Boolean(process.env.OPENAI_API_KEY),
          demo_mode: DEMO_MODE,
          korea_only: process.env.KOREA_ONLY !== '0',
          agoda_affiliate: Boolean(process.env.AGODA_CID),
          trip_affiliate: hasTripAffiliate(),
        });
      }
      if (path === '/agoda/status') {
        let korea_properties = 0;
        try {
          korea_properties = Number((await dbQuery(`SELECT COUNT(*)::int AS n FROM properties WHERE source='agoda' AND country_code='KR'`))[0]?.n || 0);
        } catch {
          korea_properties = 0;
        }
        return json({
          cid_configured: Boolean(process.env.AGODA_CID),
          api_configured: Boolean(process.env.AGODA_API_KEY && process.env.AGODA_SITE_ID),
          trip_alliance_configured: hasTripAffiliate(),
          korea_properties,
          money: '체크아웃이 완료된 아고다 예약은 미국 달러 기준 4~5% 수수료가 정산되며, 월 최소 정산액은 200달러입니다. 트립닷컴은 기본 수수료 최대 7%, 웹 쿠키 30일입니다.',
        });
      }
      if (path === '/prices') {
        return json(
          { plans: PRICES, currency: 'KRW', tax_note: '제시 요금은 예시 가격이며, 부가세·환불정책은 실제 운영 전 확정해야 합니다.' },
          200,
          CDN_CACHE,
        );
      }
      if (path === '/home') {
        const today = seoulToday();
        const [featured, couponRows] = await Promise.all([
          dbQuery(
            `SELECT ${LIST_COLUMNS} FROM properties WHERE active=true ORDER BY sponsored DESC, coalesce(review_count,0) DESC, coalesce(review_score,0) DESC LIMIT 8`,
          ),
          dbQuery(
            `SELECT c.*, p.name AS property_name, p.city FROM coupons c JOIN properties p ON p.id=c.property_id
             WHERE c.expires>=$1 AND c.remaining>0 AND p.active=true AND (p.public_record=false OR p.partner_verified=true)
             ORDER BY c.discount_pct DESC LIMIT 8`,
            [today],
          ),
        ]);
        return json(
          {
            results: featured.map(listProperty),
            sponsored: featured.filter((r) => Boolean(r.sponsored)).map(listProperty),
            coupons: couponRows,
            plans: PRICES,
            count: featured.length,
          },
          200,
          CDN_CACHE,
        );
      }
      if (path === '/catalog/categories') {
        const categories = await dbQuery(`SELECT category, COUNT(*)::int AS count FROM properties WHERE active=true GROUP BY category ORDER BY category`);
        const cities = await dbQuery(`SELECT city, COUNT(*)::int AS count FROM properties WHERE active=true GROUP BY city ORDER BY count DESC, city LIMIT 40`);
        return json({ categories, cities, market: 'KR', claim: '아고다 제휴·공개자료 기반, 실시간 재고는 아고다에서 확인' });
      }
      if (path === '/photos/search') {
        const cat = url.searchParams.get('category') || '';
        const city = url.searchParams.get('city') || '';
        const q = (url.searchParams.get('q') || '').toLowerCase().slice(0, 100);
        const photoParams: unknown[] = [];
        const photoWhere = ['active=true', `coalesce(photo_url,'') <> ''`];
        if (cat) {
          photoParams.push(cat);
          photoWhere.push(`category = $${photoParams.length}`);
        }
        if (city) {
          photoParams.push(`%${city}%`);
          photoWhere.push(`city ILIKE $${photoParams.length}`);
        }
        if (q) {
          photoParams.push(`%${q}%`);
          photoWhere.push(`(name ILIKE $${photoParams.length} OR address ILIKE $${photoParams.length} OR city ILIKE $${photoParams.length})`);
        }
        photoParams.push(300);
        const matches = (await dbQuery(`SELECT * FROM properties WHERE ${photoWhere.join(' AND ')} ORDER BY coalesce(review_count,0) DESC LIMIT $${photoParams.length}`, photoParams)).map(mapProperty);
        return json({
          count: matches.length,
          images: matches.slice(0, 300).map((p) => ({
            property_id: p.id,
            name: p.name,
            city: p.city,
            category: p.category,
            photo_url: p.photo_url,
            photo_license: p.photo_license,
            photo_author: p.photo_author,
            photo_credit: p.photo_credit,
            status: p.photo_url && p.photo_license ? 'licensed_real_photo' : 'rights_pending',
            source_url: p.source_url,
          })),
        });
      }
      if (path === '/map') {
        const latRaw = url.searchParams.get('lat');
        const lngRaw = url.searchParams.get('lng');
        const lat = latRaw ? Number(latRaw) : Number.NaN;
        const lng = lngRaw ? Number(lngRaw) : Number.NaN;
        const city = url.searchParams.get('city') || '';
        const hasUser = Number.isFinite(lat) && Number.isFinite(lng);
        const koreaGeo = `lat BETWEEN 33 AND 39.6 AND lng BETWEEN 124.5 AND 132`;
        const rows = hasUser
          ? await dbQuery(
              `SELECT ${LIST_COLUMNS} FROM properties WHERE active=true AND ${koreaGeo} ORDER BY (lat - $1)^2 + (lng - $2)^2 ASC LIMIT 80`,
              [lat, lng],
            )
          : await dbQuery(
              `SELECT ${LIST_COLUMNS} FROM properties WHERE active=true AND ${koreaGeo} AND city=$1 ORDER BY coalesce(review_count,0) DESC, name ASC LIMIT 80`,
              [city || '서울'],
            );
        const pins = rows.map(listProperty).map((p) => ({
          id: p.id,
          name: p.name,
          city: p.city,
          area: p.area,
          category: p.category,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          distance_km:
            hasUser && p.lat != null && p.lng != null ? Math.round(haversine(lat, lng, p.lat, p.lng) * 10) / 10 : undefined,
          photo_url: p.photo_url,
          image_url: p.image_url,
          source: p.source,
          affiliate_url: p.affiliate_url,
          agoda_hotel_id: p.agoda_hotel_id,
        }));
        return json({
          user: hasUser ? { lat, lng } : null,
          count: pins.length,
          pins,
          google: true,
        });
      }
      if (path === '/properties' || path === '/search') {
        const maxp = url.searchParams.get('max_price');
        const lat = url.searchParams.get('lat');
        const lng = url.searchParams.get('lng');
        const result = await searchProperties(
          url.searchParams.get('q') || '',
          url.searchParams.get('city') || '',
          maxp && /^\d+$/.test(maxp) ? Number(maxp) : null,
          lat ? Number(lat) : null,
          lng ? Number(lng) : null,
          url.searchParams.get('category') || '',
        );
        if (url.searchParams.get('q') || url.searchParams.get('city')) {
          await dbQuery(`INSERT INTO analytics(event) VALUES ('search')`);
        }
        const cache = url.searchParams.get('q') || url.searchParams.get('lat') ? 'no-store' : CDN_CACHE;
        return json(result, 200, cache);
      }
      if (path === '/coupons') {
        const today = seoulToday();
        const rows = await dbQuery(
          `SELECT c.*, p.name AS property_name, p.city FROM coupons c JOIN properties p ON p.id=c.property_id
           WHERE c.expires>=$1 AND c.remaining>0 AND p.active=true AND (p.public_record=false OR p.partner_verified=true)
           ORDER BY c.discount_pct DESC`,
          [today],
        );
        return json({ coupons: rows }, 200, CDN_CACHE);
      }
      if (path === '/weekly') return json({ weekly: await ensureWeekly(), time_zone: 'Asia/Seoul', maps_ar_mode: 'open_google_maps_app_then_select_lens_if_supported' }, 200, CDN_CACHE);
      if (path === '/promos') {
        await ensureWeekly();
        const rows = await dbQuery(`SELECT * FROM promo_campaigns WHERE status IN ('demo','active') ORDER BY CASE campaign_type WHEN 'welcome' THEN 0 WHEN 'region' THEN 1 WHEN 'weekday' THEN 2 WHEN 'longstay' THEN 3 WHEN 'partner' THEN 4 ELSE 5 END`);
        const today = seoulToday();
        const campaigns = rows.map(visibleCampaign).filter((c) => {
          if (c.status === 'demo' && !DEMO_MODE) return false;
          if (c.status === 'active' && !c.funding_approved) return false;
          return String(c.valid_from) <= today && today <= String(c.valid_until);
        });
        return json({ campaigns, demo_mode: DEMO_MODE, claim: '할인 재원과 숙소 승인이 완료된 상품만 실제 적용 가능합니다.' });
      }
      if (path === '/promos/admin') {
        if (!me?.admin && !(DEMO_MODE && req.headers.get('X-Admin-Token') && req.headers.get('X-Admin-Token') === process.env.ADMIN_TOKEN)) return fail('운영자 권한 필요', 403);
        await ensureWeekly();
        const campaigns = await dbQuery(`SELECT * FROM promo_campaigns ORDER BY updated_at DESC`);
        const stats = await dbQuery(`SELECT campaign_id, kind, COUNT(*)::int AS total FROM promo_events GROUP BY campaign_id, kind`);
        return json({ campaigns, stats });
      }
      if (path === '/partner/overview') {
        if (!me) return fail('구글 로그인 필요', 401);
        const ids = me.admin
          ? (await dbQuery(`SELECT id FROM properties WHERE coalesce(source,'') <> 'agoda'`)).map((r) => String(r.id))
          : (await dbQuery(`SELECT property_id FROM property_partners WHERE google_email=$1`, [me.email])).map((r) => String(r.property_id));
        const properties = [];
        const bookings = [];
        const chats = [];
        for (const pid of ids) {
          const p = await dbQuery(`SELECT * FROM properties WHERE id=$1`, [pid]);
          if (p[0]) properties.push(mapProperty(p[0]));
          bookings.push(...(await dbQuery(`SELECT b.*, p.name AS property_name FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.property_id=$1 ORDER BY b.created_at DESC LIMIT 30`, [pid])));
          chats.push(...(await dbQuery(`SELECT c.*, p.name AS property_name FROM conversations c JOIN properties p ON p.id=c.property_id WHERE c.property_id=$1 ORDER BY c.created_at DESC LIMIT 30`, [pid])));
        }
        return json({ properties, bookings, chats, subscriptions: [], search_count: 0, is_partner: true });
      }
      if (path === '/admin/overview') {
        if (!me?.admin && !(DEMO_MODE && req.headers.get('X-Admin-Token') === process.env.ADMIN_TOKEN)) return fail('관리자 권한 필요', 403);
        const properties = (await dbQuery(`SELECT * FROM properties WHERE coalesce(source,'') <> 'agoda' ORDER BY name`)).map(mapProperty);
        const bookings = await dbQuery(`SELECT b.*, p.name AS property_name FROM bookings b JOIN properties p ON p.id=b.property_id ORDER BY b.created_at DESC LIMIT 50`);
        const chats = await dbQuery(`SELECT c.*, p.name AS property_name FROM conversations c JOIN properties p ON p.id=c.property_id ORDER BY c.created_at DESC LIMIT 50`);
        const subscriptions = await dbQuery(`SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 50`);
        const search = await dbQuery(`SELECT COUNT(*)::int AS n FROM analytics WHERE event='search'`);
        return json({ properties, bookings, chats, subscriptions, search_count: search[0]?.n || 0 });
      }
      if (path === '/privacy/export') {
        if (!me) return fail('구글 로그인 필요', 401);
        const bookings = await dbQuery(`SELECT id,property_id,checkin,checkout,guests,status,amount,created_at FROM bookings WHERE lower(email)=$1`, [me.email]);
        const chats = await dbQuery(`SELECT id,property_id,created_at FROM conversations WHERE lower(guest_email)=$1`, [me.email]);
        const claims = await dbQuery(`SELECT coupon_id,used,created_at FROM coupon_claims WHERE lower(email)=$1`, [me.email]);
        const promo_claims = await dbQuery(`SELECT campaign_id,status,issued_at FROM promo_vouchers WHERE email_hash=$1`, [maskEmail(me.email)]);
        return json({ email: me.email, booking_requests: bookings, chat_requests: chats, coupon_claims: claims, promo_claims });
      }
      if (path === '/blogger/posts') {
        const blogId = url.searchParams.get('blog_id') || '';
        const key = process.env.GOOGLE_API_KEY;
        if (!key) return fail('구글 API 키가 필요합니다', 503);
        const r = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?key=${encodeURIComponent(key)}&maxResults=8&fetchBodies=false`);
        if (!r.ok) return fail('블로거 글 조회 실패', 503);
        const doc = await r.json();
        const posts = (doc.items || []).map((x: { title?: string; url?: string; published?: string }) => ({ title: x.title || '', url: x.url || '', published: x.published || '' })).filter((x: { url: string }) => x.url.startsWith('https://'));
        return json({ posts });
      }
      if (path === '/youtube/search') {
        const q = url.searchParams.get('q') || '제주 여행';
        const key = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
        if (!key) return json({ videos: [] });
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`);
        if (!r.ok) return json({ videos: [] });
        const doc = await r.json();
        const videos = (doc.items || []).map((x: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }) => ({
          id: x.id?.videoId,
          title: x.snippet?.title,
          channel: x.snippet?.channelTitle,
          thumbnail: x.snippet?.thumbnails?.medium?.url,
        }));
        return json({ videos });
      }
      if (slug[0] === 'properties' && slug[2] === 'blog-posts' && slug[1]) {
        const row = await dbQuery(`SELECT blog_id FROM properties WHERE id=$1 AND active=true`, [slug[1]]);
        if (!row[0]) return fail('숙소가 없습니다.', 404);
        if (!/^\d{5,30}$/.test(String(row[0].blog_id || ''))) return json({ posts: [], status: 'not_connected' });
        return json({ posts: [], status: 'connected' });
      }
      if (slug[0] === 'properties' && slug[1] && slug.length === 2) {
        const r = await dbQuery(`SELECT * FROM properties WHERE id=$1 AND active=true`, [slug[1]]);
        return r[0] ? json({ property: mapProperty(r[0]) }) : json({ error: '숙소가 없습니다.' }, 404);
      }
      if (slug[0] === 'chat' && slug[1]) {
        const id = slug[1];
        const token = req.headers.get('X-Chat-Token') || '';
        const access = await dbQuery(`SELECT token_hash FROM conversation_access WHERE conversation_id=$1`, [id]);
        const permitted = Boolean(access[0] && token && sha256(token) === access[0].token_hash);
        if (!permitted && !me?.admin) return fail('대화 권한이 없습니다.', 403);
        const messages = await dbQuery(`SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at`, [id]);
        return json({ messages });
      }
      if (path === '/deals') {
        await expireTimeDeals();
        const stayId = String(url.searchParams.get('stay_id') || '').slice(0, 80);
        const token = readCookie(req, DEAL_COOKIE);
        let current = null;
        try {
          if (token) {
            const row = (await dbQuery(`SELECT * FROM time_deals WHERE token=$1`, [token]))[0];
            if (row && (!stayId || String(row.stay_id) === stayId)) current = publicDeal(row);
          }
        } catch {
          current = null;
        }
        return json({
          ok: true,
          policy: dealPolicy(),
          current,
          channel_url: process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL || '',
          kakao_js_key: Boolean(process.env.NEXT_PUBLIC_KAKAO_JS_KEY),
        });
      }
      return fail('경로를 찾을 수 없습니다.', 404);
    }

    if (req.method !== 'POST') return fail('허용되지 않은 메서드', 405);
    const x = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!x || typeof x !== 'object') return fail('JSON 객체가 필요합니다.');

    if (path === '/privacy/delete-request') {
      if (!me) return fail('검증된 구글 로그인 필요', 401);
      const kind = String(x.kind || 'delete');
      if (!['delete', 'review'].includes(kind)) return fail('요청 형식 오류');
      const rid = uuid();
      await dbQuery(`INSERT INTO privacy_requests(id,google_email,kind) VALUES ($1,$2,$3)`, [rid, me.email, kind]);
      return json({ request_id: rid, status: 'requested', notice: '개인정보 처리 담당자에게 검증 및 삭제 요청을 전달하기 위한 접수 기록입니다. 자동 삭제는 하지 않습니다.' }, 201);
    }
    if (path === '/promos/preview') {
      const amount = Number(x.sample_amount || 0);
      const nights = Number(x.nights || 1);
      if (!(amount >= 0 && amount <= 30000000 && nights >= 1 && nights <= 60)) return fail('예시 금액·숙박일 범위를 확인하세요.');
      const c = (await dbQuery(`SELECT * FROM promo_campaigns WHERE id=$1`, [String(x.campaign_id || '')]))[0];
      if (!c) return fail('행사를 찾을 수 없습니다.');
      const err = checkEligibility(c, amount, nights, String(x.city || ''), String(x.property_id || ''), String(x.checkin || ''));
      const discount = err ? 0 : discountFor(c, amount);
      return json({ eligible: !err, reason: err, discount_krw: discount, amount_after: amount - discount, input_is_simulation: true, notice: '금액은 사용자가 입력한 예시이며 실제 숙소 요금·예약 가능 여부를 뜻하지 않습니다.' });
    }
    if (path === '/promos/claim') {
      const email = String(x.email || '').toLowerCase().trim().slice(0, 180);
      if (x.privacy_consent !== true) return fail('개인정보 처리 목적과 이용 조건에 동의해야 합니다.');
      if (!emailOk(email)) return fail('이메일 주소를 확인해 주세요.');
      try {
        const result = await dbTx(async (db) => {
          await ensureWeekly();
          const c = (await db.query(`SELECT * FROM promo_campaigns WHERE id=$1`, [String(x.campaign_id || '').slice(0, 100)]))[0];
          if (!c) throw new Error('행사를 찾을 수 없습니다.');
          if (c.status === 'demo' && !DEMO_MODE) throw new Error('시연용 혜택은 실제 운영에서 발급할 수 없습니다.');
          if (c.status === 'active' && (!me || me.email !== email)) throw new Error('실제 쿠폰은 본인 인증된 구글 로그인 이메일로만 발급됩니다.');
          const err = checkEligibility(c, Math.max(Number(c.min_spend), 0), Number(c.min_nights), String(c.city), String(c.property_id));
          if (err) throw new Error(err);
          if (Number(c.total_claims) > 0 && Number(c.claimed_count) >= Number(c.total_claims)) throw new Error('발급 수량이 종료되었습니다.');
          const target = maskEmail(email);
          const count = (await db.query(`SELECT COUNT(*)::int AS n FROM promo_vouchers WHERE campaign_id=$1 AND email_hash=$2 AND status<>'canceled'`, [c.id, target]))[0];
          if (Number(count.n) >= Number(c.per_email_limit)) throw new Error('이 계정은 이미 해당 행사 쿠폰을 받았습니다.');
          const code = 'MMP-' + tokenHex(8);
          await db.query(`INSERT INTO promo_vouchers(code_hash,code_prefix,campaign_id,email_hash,status,booking_id) VALUES ($1,$2,$3,$4,'issued','')`, [sha256(code), code.slice(0, 7), c.id, target]);
          await db.query(`UPDATE promo_campaigns SET claimed_count=claimed_count+1, updated_at=NOW() WHERE id=$1`, [c.id]);
          await db.query(`INSERT INTO promo_events(campaign_id,kind) VALUES ($1,$2)`, [c.id, c.status === 'demo' ? 'claim_demo' : 'claim']);
          return { code, campaign_id: c.id, title: c.title, demo_only: c.status === 'demo', valid_until: c.valid_until, notice: c.status === 'demo' ? '체험용 쿠폰입니다. 실제 숙박 할인이나 예약 확정에 사용할 수 없습니다.' : '숙소가 승인한 적용 조건을 확인한 후 예약에 적용하세요.' };
        });
        return json(result, 201);
      } catch (err) {
        return fail(err instanceof Error ? err.message : '발급 실패', 409);
      }
    }
    if (path === '/coupons/claim') {
      if (x.privacy_consent !== true) return fail('개인정보 수집·이용 동의가 필요합니다.');
      const email = String(x.email || '').trim().toLowerCase().slice(0, 180);
      if (!emailOk(email)) return fail('이메일 형식 오류');
      if (!DEMO_MODE && (!me || me.email !== email)) return fail('운영 쿠폰은 구글 본인 인증 후 발급할 수 있습니다.', 403);
      try {
        const result = await dbTx(async (db) => {
          const c = (await db.query(`SELECT * FROM coupons WHERE id=$1 AND expires>=$2 AND remaining>0`, [String(x.coupon_id || ''), seoulToday()]))[0];
          if (!c) throw new Error('사용 불가능한 쿠폰');
          const dup = await db.query(`SELECT 1 FROM coupon_claims WHERE coupon_id=$1 AND email=$2`, [c.id, email]);
          if (dup[0]) throw new Error('같은 이메일에는 쿠폰을 한 번만 발급할 수 있습니다.');
          const token = tokenHex(8);
          await db.query(`INSERT INTO coupon_claims(token,coupon_id,email,used) VALUES ($1,$2,$3,false)`, [token, c.id, email]);
          await db.query(`UPDATE coupons SET remaining=remaining-1 WHERE id=$1 AND remaining>0`, [c.id]);
          return { token, discount_pct: c.discount_pct, property_id: c.property_id };
        });
        return json(result, 201);
      } catch (err) {
        return fail(err instanceof Error ? err.message : '쿠폰 발급 실패', 409);
      }
    }
    if (path === '/bookings') {
      if (x.privacy_consent !== true) return fail('개인정보 수집·이용 동의가 필요합니다.');
      const name = String(x.guest_name || '').trim().slice(0, 80);
      const email = String(x.email || '').trim().slice(0, 180);
      const ci = String(x.checkin || '');
      const co = String(x.checkout || '');
      const guests = Number(x.guests || 2);
      if (!name || !emailOk(email)) return fail('이름과 이메일을 확인하세요');
      const a = new Date(ci);
      const b = new Date(co);
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a || guests < 1 || guests > 12) return fail('예약 날짜 또는 인원 범위 오류');
      const nights = Math.round((b.getTime() - a.getTime()) / 86400000);
      if (nights > 30) return fail('예약 날짜 또는 인원 범위 오류');
      try {
        const result = await dbTx(async (db) => {
          const prop = (await db.query(`SELECT * FROM properties WHERE id=$1 AND active=true`, [String(x.property_id || '')]))[0];
          if (!prop) throw new Error('검증된 숙소가 아닙니다.');
          if (prop.public_record) throw new Error('공공데이터 숙소는 객실요금·재고가 연동되지 않아 쿠폰 적용과 예약 금액 계산을 사용할 수 없습니다.');
          let amount = Number(prop.price) * nights;
          const token = String(x.coupon_token || '').slice(0, 30);
          const promoCode = String(x.promo_code || '').trim().slice(0, 40);
          if (token && promoCode) throw new Error('기존 쿠폰과 행사 할인권은 중복 사용할 수 없습니다.');
          const bid = uuid();
          let promoCampaignId = '';
          let promoDiscount = 0;
          if (promoCode) {
            const key = sha256(promoCode.toUpperCase());
            const row = (await db.query(`SELECT c.*, v.status AS voucher_status, v.email_hash FROM promo_vouchers v JOIN promo_campaigns c ON c.id=v.campaign_id WHERE v.code_hash=$1`, [key]))[0];
            if (!row || row.voucher_status !== 'issued' || row.email_hash !== maskEmail(email)) throw new Error('쿠폰 코드를 확인하거나 발급 계정을 확인해 주세요.');
            const err = checkEligibility(row, amount, nights, String(prop.city), String(prop.id), ci);
            if (err) throw new Error(err);
            promoDiscount = discountFor(row, amount);
            promoCampaignId = String(row.id);
            amount -= promoDiscount;
            await db.query(`UPDATE promo_vouchers SET status='reserved', booking_id=$1, reserved_at=NOW() WHERE code_hash=$2 AND status='issued'`, [bid, key]);
          }
          if (token) {
            const claim = (await db.query(
              `SELECT c.*, c2.discount_pct FROM coupon_claims c JOIN coupons c2 ON c2.id=c.coupon_id
               WHERE c.token=$1 AND c2.property_id=$2 AND c.used=false AND COALESCE(c.reserved_booking_id,'')='' AND c.email=$3 AND c2.expires>=$4`,
              [token, prop.id, email.toLowerCase(), seoulToday()],
            ))[0];
            if (!claim) throw new Error('사용할 수 없는 쿠폰 코드');
            amount -= Math.floor((amount * Number(claim.discount_pct)) / 100);
            await db.query(`UPDATE coupon_claims SET reserved_booking_id=$1, reserved_at=$2 WHERE token=$3 AND used=false AND COALESCE(reserved_booking_id,'')=''`, [bid, new Date().toISOString(), token]);
          }
          await db.query(
            `INSERT INTO bookings(id,property_id,guest_name,email,checkin,checkout,guests,amount,coupon_token,status,promo_campaign_id,promo_discount)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'requested',$10,$11)`,
            [bid, prop.id, name, email, ci, co, guests, amount, token, promoCampaignId, promoDiscount],
          );
          return { booking_id: bid, amount, promo_discount: promoDiscount, status: 'requested', notice: '데모 예약 요청만 저장되었습니다. 실제 재고 확인이나 숙소 예약 확정이 아닙니다.' };
        });
        return json(result, 201);
      } catch (err) {
        return fail(err instanceof Error ? err.message : '예약 실패', 409);
      }
    }
    if (path === '/chat/start') {
      if (x.privacy_consent !== true) return fail('개인정보 수집·이용 동의가 필요합니다.');
      const name = String(x.guest_name || '').trim().slice(0, 80);
      const email = String(x.email || '').trim().slice(0, 180);
      const message = String(x.message || '').trim().slice(0, 1200);
      if (!name || !message || !emailOk(email)) return fail('이름·이메일·메시지를 입력하세요');
      const prop = (await dbQuery(`SELECT public_record, partner_verified FROM properties WHERE id=$1 AND active=true`, [String(x.property_id || '')]))[0];
      if (!prop) return fail('숙소 없음', 404);
      if (prop.public_record && !prop.partner_verified) return fail('아직 해당 숙소가 플랫폼 상담 서비스에 가입하지 않았습니다.', 409);
      const cid = uuid();
      const access = tokenUrl(24);
      await dbQuery(`INSERT INTO conversations VALUES ($1,$2,$3,$4,NOW())`, [cid, x.property_id, name, email]);
      await dbQuery(`INSERT INTO conversation_access VALUES ($1,$2)`, [cid, sha256(access)]);
      await dbQuery(`INSERT INTO messages VALUES ($1,$2,'guest',$3,NOW())`, [uuid(), cid, message]);
      return json({ conversation_id: cid, token: access, status: 'received', mail_configured: Boolean(process.env.SMTP_HOST) }, 201);
    }
    if (path === '/chat/send') {
      const cid = String(x.conversation_id || '');
      const token = String(x.token || '');
      const body = String(x.message || '').trim().slice(0, 1200);
      if (!body) return fail('메시지 누락');
      const access = (await dbQuery(`SELECT token_hash FROM conversation_access WHERE conversation_id=$1`, [cid]))[0];
      const permitted = Boolean(access && token && sha256(token) === access.token_hash);
      if (!permitted && !me?.admin) return fail('대화 권한이 없습니다.', 403);
      const role = me?.admin ? 'host' : 'guest';
      await dbQuery(`INSERT INTO messages VALUES ($1,$2,$3,$4,NOW())`, [uuid(), cid, role, body]);
      return json({ sent: true, role }, 201);
    }
    if (path === '/partner/blogger/connect') {
      if (!me) return fail('숙소 관리 권한이 없습니다.', 403);
      const pid = String(x.property_id || '');
      if (!(await canEdit(me, pid))) return fail('숙소 관리 권한이 없습니다.', 403);
      return fail('구글 인증 계정이 소유한 블로거가 아닙니다.', 403);
    }
    if (path === '/promos/admin/save') {
      if (!me?.admin && req.headers.get('X-Admin-Token') !== process.env.ADMIN_TOKEN) return fail('관리자 인증 필요', 403);
      const action = String(x.action || '');
      const status = action === 'pause' ? 'paused' : action === 'end' ? 'ended' : action === 'resume_demo' ? 'demo' : '';
      if (!status) return fail('지원하지 않는 작업입니다.');
      await dbQuery(`UPDATE promo_campaigns SET status=$1, updated_at=NOW() WHERE id=$2`, [status, String(x.id || '')]);
      return json({ saved: true, status });
    }
    if (path === '/deals/start') {
      await expireTimeDeals();
      const stayId = String(x.stay_id || '').slice(0, 80);
      const source = String(x.source || 'site').slice(0, 24);
      const stay = (await dbQuery(`SELECT * FROM properties WHERE id=$1 AND active=true`, [stayId]))[0];
      if (!stay) return fail('숙소를 찾을 수 없습니다.', 404);
      const bookUrl = agodaBookUrl(mapProperty(stay));
      if (!bookUrl) return fail('이 숙소는 아고다 예약 링크가 없어 타임딜을 열 수 없습니다.');
      const existingToken = readCookie(req, DEAL_COOKIE);
      try {
        if (existingToken) {
          const same = (
            await dbQuery(
              `SELECT * FROM time_deals WHERE token=$1 AND stay_id=$2 AND status IN ('active','clicked') AND expires_at > NOW()`,
              [existingToken, stayId],
            )
          )[0];
          if (same) {
            return jsonCookie(
              { ok: true, deal: publicDeal(same), policy: dealPolicy(), reused: true },
              dealCookieHeader(String(same.token), new Date(String(same.expires_at))),
            );
          }
          await dbQuery(
            `UPDATE time_deals SET status='expired' WHERE token=$1 AND status IN ('active','clicked')`,
            [existingToken],
          );
        }
        const token = tokenUrl(24);
        const expires = dealExpiresAt();
        const character = characterForSource(source);
        await dbQuery(
          `INSERT INTO time_deals(token,stay_id,stay_name,source,character_id,amount_krw,min_spend_krw,status,started_at,expires_at,user_agent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'active',NOW(),$8,$9)`,
          [
            token,
            stayId,
            String(stay.name || '').slice(0, 180),
            source,
            character,
            DEAL_AMOUNT_KRW,
            DEAL_MIN_SPEND_KRW,
            expires.toISOString(),
            String(req.headers.get('user-agent') || '').slice(0, 240),
          ],
        );
        const row = (await dbQuery(`SELECT * FROM time_deals WHERE token=$1`, [token]))[0];
        return jsonCookie(
          { ok: true, deal: publicDeal(row), policy: dealPolicy(), reused: false },
          dealCookieHeader(token, expires),
          201,
        );
      } catch (err) {
        console.error(err);
        return fail('타임딜 테이블이 없습니다. sql/007_time_deals.sql 마이그레이션이 필요합니다.', 503);
      }
    }
    if (path === '/deals/click') {
      await expireTimeDeals();
      const token = readCookie(req, DEAL_COOKIE);
      if (!token) return fail('활성화된 타임딜이 없습니다. 숙소에서 18시간 쿠폰을 먼저 받아 주세요.', 409);
      const stayId = String(x.stay_id || '').slice(0, 80);
      try {
        const row = (await dbQuery(`SELECT * FROM time_deals WHERE token=$1`, [token]))[0];
        if (!row) return fail('쿠폰을 찾을 수 없습니다.', 404);
        if (stayId && String(row.stay_id) !== stayId) return fail('이 숙소의 타임딜이 아닙니다.', 409);
        if (String(row.status) === 'expired' || new Date(String(row.expires_at)).getTime() <= Date.now()) {
          await dbQuery(`UPDATE time_deals SET status='expired' WHERE token=$1`, [token]);
          return fail('18시간이 지나 쿠폰이 만료되었습니다. 아고다 추적이 끊기기 전에 결제하지 않으면 수수료가 정산되지 않습니다.', 410);
        }
        const stay = (await dbQuery(`SELECT * FROM properties WHERE id=$1 AND active=true`, [row.stay_id]))[0];
        const bookUrl = stay ? agodaBookUrl(mapProperty(stay)) : '';
        if (!bookUrl) return fail('아고다 예약 링크가 없습니다.', 409);
        await dbQuery(`UPDATE time_deals SET status='clicked', clicked_at=NOW() WHERE token=$1 AND status='active'`, [token]);
        const next = (await dbQuery(`SELECT * FROM time_deals WHERE token=$1`, [token]))[0];
        return json({
          ok: true,
          book_url: bookUrl,
          deal: publicDeal(next || row),
          hours: DEAL_HOURS,
          notice: '아고다 새 창에서 18시간 안에 결제를 완료하세요. 창을 닫아도 타이머는 계속 갑니다.',
        });
      } catch (err) {
        console.error(err);
        return fail('타임딜을 확인하지 못했습니다.', 503);
      }
    }
    if (path === '/checkout') {
      return fail('결제 키가 설정되지 않아 테스트용 결제 링크는 생성하지 않습니다.', 503);
    }
    return fail('경로를 찾을 수 없습니다.', 404);
  } catch (err) {
    console.error(err);
    return fail('서버 오류', 500);
  }
}

export { CATEGORY_SLUGS, mapProperty };
