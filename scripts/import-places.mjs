/**
 * 한국관광공사 TourAPI 4.0 공식 목록만 가져와 places에 저장한다. 웹사이트 스크래핑 없음.
 */
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

const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const AREAS = [
  ['서울', 1],
  ['부산', 6],
  ['제주', 39],
  ['경기', 31],
  ['강원', 32],
  ['경북', 35],
  ['전북', 37],
];

const key = (process.env.TOUR_API_KEY || process.env.DATA_GO_KR_SERVICE_KEY || process.env.KTO_SERVICE_KEY || '').trim();
if (!key) {
  console.error('Set TOUR_API_KEY or DATA_GO_KR_SERVICE_KEY (data.go.kr TourAPI 4.0)');
  process.exit(1);
}

async function tourGet(op, extra) {
  const q = new URLSearchParams({
    serviceKey: key,
    MobileOS: 'ETC',
    MobileApp: 'YEOHANG',
    _type: 'json',
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  });
  const r = await fetch(`${BASE}/${op}?${q}`);
  if (!r.ok) throw new Error(`${op} ${r.status}`);
  const doc = await r.json();
  const item = doc?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
let n = 0;
try {
  for (const [city, areaCode] of AREAS) {
    const list = await tourGet('areaBasedList2', {
      areaCode,
      contentTypeId: 12,
      numOfRows: 15,
      pageNo: 1,
      arrange: 'Q',
    });
    for (const item of list) {
      const contentId = String(item.contentid || '');
      if (!contentId) continue;
      let overview = String(item.overview || '');
      try {
        const detail = await tourGet('detailCommon2', {
          contentId,
          defaultYN: 'Y',
          firstImageYN: 'Y',
          addrinfoYN: 'Y',
          mapinfoYN: 'Y',
          overviewYN: 'Y',
        });
        if (detail[0]?.overview) overview = String(detail[0].overview);
      } catch {}
      const id = `tourapi-${contentId}`;
      await client.query(
        `INSERT INTO places(id,content_id,name,city,area,category,address,overview,tel,homepage,lat,lng,image_url,source,keywords)
         VALUES ($1,$2,$3,$4,$5,'관광지',$6,$7,$8,$9,$10,$11,$12,'tourapi',$13)
         ON CONFLICT (id) DO UPDATE SET overview=COALESCE(NULLIF(EXCLUDED.overview,''), places.overview), image_url=COALESCE(NULLIF(EXCLUDED.image_url,''), places.image_url)`,
        [
          id,
          contentId,
          String(item.title || '').slice(0, 120),
          city,
          String(item.addr2 || '').slice(0, 40),
          String(item.addr1 || ''),
          overview.slice(0, 1200),
          String(item.tel || ''),
          String(item.homepage || '').replace(/<[^>]+>/g, '').slice(0, 300),
          item.mapy ? Number(item.mapy) : null,
          item.mapx ? Number(item.mapx) : null,
          String(item.firstimage || ''),
          String(item.title || ''),
        ],
      );
      n += 1;
    }
    console.log(city, list.length);
  }
  console.log('imported', n, 'tourapi places');
} finally {
  await client.end();
}
