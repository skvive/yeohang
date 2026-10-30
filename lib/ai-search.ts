import { dbQuery } from '@/lib/db';
import { LIST_COLUMNS, extractSearch, listProperty } from '@/lib/domain';
import { completeJson, openRouterConfigured } from '@/lib/openrouter';
import { type Sight, sightsFor } from '@/lib/sights';

export type AiInterpretation = {
  city: string;
  category: string;
  amenities: string[];
  max_price: number | null;
  answer: string;
  sights: Sight[];
};

const SYSTEM = `당신은 한국 여행 숙소 검색 도우미입니다. 사용자 문장을 해석해 JSON만 반환하세요.
스키마:
{"city":"서울|부산|제주|경주|전주|가평|속초|강릉|평창|고성|인천|대구|대전|광주 중 하나 또는 빈문자","category":"호텔|리조트|펜션·풀빌라|한옥|게스트하우스|캠핑·글램핑 또는 빈문자","amenities":["오션뷰"],"max_price":200000또는null,"answer":"한국어 2~4문장. 조건 요약과 여행 조언. 광고 문구 금지.","sights":[{"name":"명소","area":"구/동","why":"한 문장"}]}
규칙: 사이트 숙소 DB를 검색할 필터만 추출. 없는 숙소명을 지어내지 말 것. sights는 해당 도시 실제 관광지 3~5곳.`;

function asText(v: unknown) {
  return String(v || '').trim();
}

function asAmenities(v: unknown) {
  if (!Array.isArray(v)) return [] as string[];
  return v.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 6);
}

function asSights(v: unknown): Sight[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      const r = row as Record<string, unknown>;
      return { name: asText(r.name).slice(0, 40), area: asText(r.area).slice(0, 30), why: asText(r.why).slice(0, 80) };
    })
    .filter((s) => s.name)
    .slice(0, 5);
}

function fallbackAnswer(q: string, city: string, amenities: string[], maxPrice: number | null) {
  const bits = [city || '국내', amenities.length ? amenities.join('·') : '숙소', maxPrice ? `${Math.round(maxPrice / 10000)}만 원 이하` : '']
    .filter(Boolean)
    .join(' · ');
  return `${q.slice(0, 80)} 조건으로 ${bits}를 찾았습니다. 아래는 여행갈지도에 있는 숙소 5곳과 인근 관광지입니다. 실시간 요금은 아고다·트립닷컴에서 확인하세요.`;
}

export async function interpretQuery(q: string): Promise<{ interpretation: AiInterpretation; engine: string; model: string }> {
  const rules = extractSearch(q);
  const base: AiInterpretation = {
    city: rules.city,
    category: '',
    amenities: rules.amenities,
    max_price: rules.max_price,
    answer: fallbackAnswer(q, rules.city, rules.amenities, rules.max_price),
    sights: sightsFor(rules.city),
  };
  if (!openRouterConfigured()) {
    return { interpretation: base, engine: 'rules-demo', model: '' };
  }
  try {
    const done = await completeJson(SYSTEM, q.slice(0, 400));
    if (!done) return { interpretation: base, engine: 'rules-demo', model: '' };
    const json = done.json;
    const city = asText(json.city) || base.city;
    const amenities = asAmenities(json.amenities);
    const maxRaw = json.max_price;
    const max_price = typeof maxRaw === 'number' && maxRaw > 0 ? maxRaw : base.max_price;
    const category = asText(json.category);
    const answer = asText(json.answer) || fallbackAnswer(q, city, amenities.length ? amenities : base.amenities, max_price);
    return {
      interpretation: {
        city,
        category,
        amenities: amenities.length ? amenities : base.amenities,
        max_price,
        answer,
        sights: sightsFor(city, asSights(json.sights)),
      },
      engine: 'openrouter',
      model: done.model,
    };
  } catch {
    return { interpretation: base, engine: 'rules-fallback', model: '' };
  }
}

export async function pickStays(interp: AiInterpretation, limit = 5) {
  const clauses = ['active=true'];
  const params: unknown[] = [];
  if (interp.city) {
    params.push(`%${interp.city}%`);
    clauses.push(`(city ILIKE $${params.length} OR area ILIKE $${params.length} OR name ILIKE $${params.length})`);
  }
  if (interp.category) {
    params.push(`%${interp.category.replace('·', '%')}%`);
    clauses.push(`category ILIKE $${params.length}`);
  }
  for (const a of interp.amenities.slice(0, 3)) {
    params.push(`%${a}%`);
    clauses.push(
      `(coalesce(amenities,'') ILIKE $${params.length} OR coalesce(tagline,'') ILIKE $${params.length} OR coalesce(category,'') ILIKE $${params.length} OR coalesce(description,'') ILIKE $${params.length})`,
    );
  }
  params.push(Math.max(5, Math.min(12, limit * 2)));
  const rows = await dbQuery(
    `SELECT ${LIST_COLUMNS} FROM properties WHERE ${clauses.join(' AND ')}
     ORDER BY sponsored DESC, coalesce(review_count,0) DESC, coalesce(review_score,0) DESC, name ASC
     LIMIT $${params.length}`,
    params,
  );
  const mapped = rows.map(listProperty);
  const filtered = mapped.filter((p) => {
    if (interp.max_price && p.source !== 'agoda' && (p.price == null || Number(p.price) > interp.max_price)) return false;
    return true;
  });
  return (filtered.length ? filtered : mapped).slice(0, limit);
}

export async function pickAd(city: string, excludeIds: string[]) {
  const params: unknown[] = [];
  const clauses = [`p.active=true`, `(p.sponsored=true OR EXISTS (SELECT 1 FROM subscriptions s WHERE s.property_id=p.id AND s.status='active'))`];
  if (city) {
    params.push(`%${city}%`);
    clauses.push(`(p.city ILIKE $${params.length} OR p.area ILIKE $${params.length})`);
  }
  if (excludeIds.length) {
    params.push(excludeIds);
    clauses.push(`NOT (p.id = ANY($${params.length}::text[]))`);
  }
  const rows = await dbQuery(
    `SELECT ${LIST_COLUMNS}
     FROM properties p
     WHERE ${clauses.join(' AND ')}
     ORDER BY CASE
       WHEN p.category ILIKE '%펜션%' OR p.category ILIKE '%게스트%' OR p.category ILIKE '%모텔%' OR p.category ILIKE '%여관%' THEN 0
       ELSE 1
     END, p.sponsored DESC, coalesce(p.review_count,0) DESC
     LIMIT 1`,
    params,
  );
  return rows[0] ? listProperty(rows[0]) : null;
}

export async function logAdEvent(propertyId: string, kind: 'impression' | 'click', query = '', productId = '') {
  if (!propertyId) return;
  try {
    await dbQuery(`INSERT INTO ad_events(property_id, product_id, query, kind) VALUES ($1,$2,$3,$4)`, [
      propertyId,
      productId.slice(0, 80),
      query.slice(0, 200),
      kind,
    ]);
    await dbQuery(`INSERT INTO analytics(event, property_id) VALUES ($1,$2)`, [kind === 'click' ? 'ad_click' : 'ad_impression', propertyId]);
  } catch {
    /* table may not exist yet */
  }
}

export async function adStatsFor(propertyIds: string[]) {
  if (!propertyIds.length) return [];
  const rows = await dbQuery(
    `SELECT property_id,
            COUNT(*) FILTER (WHERE kind='impression')::int AS impressions,
            COUNT(*) FILTER (WHERE kind='click')::int AS clicks,
            MAX(created_at) AS last_event
     FROM ad_events
     WHERE property_id = ANY($1::text[])
     GROUP BY property_id`,
    [propertyIds],
  );
  const subs = await dbQuery(
    `SELECT property_id, amount_krw, plan, status, created_at
     FROM subscriptions
     WHERE property_id = ANY($1::text[]) AND status='active'
     ORDER BY created_at DESC`,
    [propertyIds],
  );
  const subMap = new Map(subs.map((s) => [String(s.property_id), s]));
  return rows.map((r) => {
    const impressions = Number(r.impressions || 0);
    const clicks = Number(r.clicks || 0);
    const amount = Number(subMap.get(String(r.property_id))?.amount_krw || 0);
    const ctr = impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const cpc = clicks ? Math.round(amount / clicks) : 0;
    const cpm = impressions ? Math.round((amount / impressions) * 1000) : 0;
    return {
      property_id: r.property_id,
      impressions,
      clicks,
      ctr,
      cpc,
      cpm,
      amount_krw: amount,
      last_event: r.last_event,
      reason: clicks
        ? `클릭 ${clicks}회 · 추정 CPC ${cpc.toLocaleString('ko-KR')}원. 구독을 유지하면 AI 검색 광고 칸을 계속 확보합니다.`
        : impressions
          ? `노출 ${impressions}회 · 클릭 전환을 위해 숙소 사진·지역 키워드를 보강하세요.`
          : '아직 노출이 없습니다. 월구독이 활성화되면 AI 답변에 광고 1칸이 표시됩니다.',
    };
  });
}
