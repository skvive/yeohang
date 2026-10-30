import { readFileSync } from 'node:fs';
import pg from 'pg';

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const records = JSON.parse(readFileSync('data/korea_public_directory_seed.json', 'utf8'));
  let inserted = 0;
  for (const [ix, r] of records.entries()) {
    const result = await client.query(
      `INSERT INTO properties (
        id, name, city, area, tagline, description, price, lat, lng, sponsored, amenities, image,
        photo_url, photo_license, verified, active, category, address, source_url, photo_author, photo_credit, public_record, partner_verified
      ) VALUES (
        $1,$2,$3,$4,$5,$6,1,$7,$8,false,$9,$10,$11,$12,false,true,$13,$14,$15,$16,$17,true,false
      ) ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.name, r.city, r.area, r.tagline, r.description,
        r.lat, r.lng, r.amenities || '', (ix % 8) + 1,
        r.photo_url || '', r.photo_license || '', r.category, r.address, r.source_url,
        r.photo_author || '', r.photo_credit || '',
      ],
    );
    inserted += result.rowCount || 0;
  }

  const seoul = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const validFrom = seoul.toISOString().slice(0, 10);
  const until = new Date(seoul);
  until.setDate(until.getDate() + 45);
  const validUntil = until.toISOString().slice(0, 10);

  const campaigns = [
    ['welcome-30', '첫 여행 웰컴딜', '처음 방문한 여행자에게 제안하는 3만원 혜택', 'welcome', '', 'fixed', 30000, 0, 150000, 1],
    ['weekday-12', '평일에 떠나는 여유', '평일 숙박 수요를 위한 최대 12% 혜택', 'weekday', '', 'percent', 12, 40000, 100000, 1],
    ['local-20', '우리 동네 여행주간', '지역 숙소를 발견하는 2만원 할인 제안', 'region', '전주', 'fixed', 20000, 0, 120000, 1],
    ['friend-10', '친구와 함께 떠나요', '친구 초대 이벤트 제안: 승인된 가입·예약 후 혜택', 'referral', '', 'fixed', 10000, 0, 100000, 1],
    ['longstay-25', '2박 3일 더 머물기', '연박 여행자에게 제안하는 2만5천원 혜택', 'longstay', '', 'fixed', 25000, 0, 200000, 2],
    ['partner-15', '숙소 파트너 단독딜', '제휴 숙소가 직접 제공하는 특별 혜택 제안', 'partner', '', 'percent', 15, 50000, 150000, 1],
  ];

  for (const c of campaigns) {
    await client.query(
      `INSERT INTO promo_campaigns (
        id, title, subtitle, campaign_type, city, property_id, discount_kind, discount_value, cap_krw,
        min_spend, min_nights, valid_from, valid_until, total_claims, claimed_count, per_email_limit,
        status, funded_by, funding_approved, terms_url
      ) VALUES (
        $1,$2,$3,$4,$5,'',$6,$7,$8,$9,$10,$11,$12,60,0,1,'demo','시연용 · 재원 미승인',false,''
      ) ON CONFLICT (id) DO NOTHING`,
      [c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], validFrom, validUntil],
    );
  }

  const count = await client.query('SELECT COUNT(*)::int AS n FROM properties WHERE public_record = true');
  console.log(`seeded public properties=${count.rows[0].n} inserted_now=${inserted} campaigns=${campaigns.length}`);
} finally {
  await client.end();
}
