import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
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

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/import-agoda-korea.mjs <Agoda_Hotels_EN.csv>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const cid = (process.env.AGODA_CID || '').trim();
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function norm(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_');
}

function pick(row, names) {
  for (const n of names) {
    if (row[n] != null && String(row[n]).trim() !== '') return String(row[n]).trim();
  }
  return '';
}

function isKorea(row) {
  const blob = [row.countryiso, row.countryiso2, row.country_iso, row.countrycode, row.country_code, row.countryname, row.country_name, row.country]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\bkr\b|\bkor\b|south korea|korea, republic|대한민국|한국/.test(blob) && !/north korea|dprk|북한/.test(blob);
}

function categoryOf(raw) {
  const t = raw.toLowerCase();
  if (/hanok|한옥|traditional korean/.test(t)) return '한옥';
  if (/resort|리조트/.test(t)) return '리조트';
  if (/camp|glamp|캠핑|글램핑/.test(t)) return '캠핑·글램핑';
  if (/guest|hostel|호스텔|게스트/.test(t)) return '게스트하우스';
  if (/pension|villa|motel|homestay|펜션|풀빌라/.test(t)) return '펜션·풀빌라';
  return '호텔';
}

function affiliateUrl(hotelId) {
  const params = new URLSearchParams({ hid: String(hotelId), currency: 'KRW', locale: 'ko-kr' });
  if (cid) params.set('cid', cid);
  return `https://www.agoda.com/partners/partnersearch.aspx?${params.toString()}`;
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

let headers = [];
let seen = 0;
let korea = 0;
let upserted = 0;
const batch = [];

async function flush() {
  if (!batch.length) return;
  const rows = batch.splice(0, batch.length);
  const values = [];
  const binds = [];
  let i = 1;
  for (const r of rows) {
    binds.push(`($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`);
    values.push(
      r.id, r.name, r.city, r.area, r.tagline, r.description, 1, r.lat, r.lng, r.amenities,
      r.photo_url, r.category, r.address, r.source_url, r.photo_author, r.photo_credit, r.photo_license,
      r.agoda_hotel_id, r.agoda_city_id, r.star_rating, r.review_score, r.review_count, r.affiliate_url,
    );
  }
  await client.query(
    `INSERT INTO properties (
      id, name, city, area, tagline, description, price, lat, lng, amenities,
      photo_url, category, address, source_url, photo_author, photo_credit, photo_license,
      agoda_hotel_id, agoda_city_id, star_rating, review_score, review_count, affiliate_url,
      source, country_code, public_record, partner_verified, verified, active, sponsored
    ) SELECT
      x.id, x.name, x.city, x.area, x.tagline, x.description, x.price, x.lat, x.lng, x.amenities,
      x.photo_url, x.category, x.address, x.source_url, x.photo_author, x.photo_credit, x.photo_license,
      x.agoda_hotel_id, x.agoda_city_id, x.star_rating, x.review_score, x.review_count, x.affiliate_url,
      'agoda', 'KR', false, false, true, true, false
    FROM (VALUES ${binds.join(',')}) AS x(
      id, name, city, area, tagline, description, price, lat, lng, amenities,
      photo_url, category, address, source_url, photo_author, photo_credit, photo_license,
      agoda_hotel_id, agoda_city_id, star_rating, review_score, review_count, affiliate_url
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      city = EXCLUDED.city,
      area = EXCLUDED.area,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      amenities = EXCLUDED.amenities,
      photo_url = EXCLUDED.photo_url,
      category = EXCLUDED.category,
      address = EXCLUDED.address,
      source_url = EXCLUDED.source_url,
      photo_author = EXCLUDED.photo_author,
      photo_credit = EXCLUDED.photo_credit,
      photo_license = EXCLUDED.photo_license,
      agoda_hotel_id = EXCLUDED.agoda_hotel_id,
      agoda_city_id = EXCLUDED.agoda_city_id,
      star_rating = EXCLUDED.star_rating,
      review_score = EXCLUDED.review_score,
      review_count = EXCLUDED.review_count,
      affiliate_url = EXCLUDED.affiliate_url,
      source = 'agoda',
      country_code = 'KR',
      active = true`,
    values,
  );
  upserted += rows.length;
}

try {
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!headers.length) {
      headers = parseCsvLine(line).map(norm);
      continue;
    }
    seen += 1;
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, ix) => {
      row[h] = cols[ix] || '';
    });
    if (!isKorea(row)) continue;
    const hotelId = pick(row, ['hotelid', 'hotel_id', 'hid']);
    if (!hotelId || !/^\d+$/.test(hotelId)) continue;
    korea += 1;
    const name = pick(row, ['hotelname', 'hotel_name', 'translatedname', 'translated_name']) || `Agoda ${hotelId}`;
    const city = pick(row, ['cityname', 'city_name', 'citytranslated', 'city']);
    const area = pick(row, ['areaname', 'area_name', 'area']) || city;
    const address = pick(row, ['address', 'addressline1', 'address_line_1']);
    const desc = pick(row, ['overview', 'description', 'hoteldescription']) || `${city} ${name}`.trim();
    const photo = pick(row, ['photo1', 'photo_1', 'imageurl', 'image_url', 'hotelpicture']);
    const acc = pick(row, ['accommodationtype', 'accommodation_type', 'propertytype', 'property_type']);
    const cityId = pick(row, ['cityid', 'city_id']);
    const lat = pick(row, ['latitude', 'lat']);
    const lng = pick(row, ['longitude', 'lng', 'lon']);
    const stars = pick(row, ['starrating', 'star_rating']);
    const score = pick(row, ['ratingaverage', 'rating_average', 'reviewscore', 'review_score']);
    const reviews = pick(row, ['numberofreviews', 'number_of_reviews', 'reviewcount', 'review_count']);
    const hotelUrl = pick(row, ['hotelurl', 'hotel_url', 'url']) || affiliateUrl(hotelId);
    batch.push({
      id: `agoda-${hotelId}`,
      name,
      city: city || '한국',
      area: area || city || '한국',
      tagline: [city, acc].filter(Boolean).join(' · ') || '아고다 제휴 숙소',
      description: desc.slice(0, 2000),
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      amenities: acc,
      photo_url: photo,
      category: categoryOf(acc || name),
      address,
      source_url: hotelUrl,
      photo_author: 'Agoda',
      photo_credit: hotelUrl,
      photo_license: 'Agoda affiliate content',
      agoda_hotel_id: Number(hotelId),
      agoda_city_id: cityId ? Number(cityId) : null,
      star_rating: stars ? Number(stars) : null,
      review_score: score ? Number(score) : null,
      review_count: reviews ? Number(reviews) : null,
      affiliate_url: affiliateUrl(hotelId),
    });
    if (batch.length >= 200) await flush();
    if (korea % 1000 === 0) console.log(`korea=${korea} upserted=${upserted} scanned=${seen}`);
  }
  await flush();
  const count = await client.query(`SELECT COUNT(*)::int AS n FROM properties WHERE source='agoda' AND country_code='KR'`);
  console.log(`done scanned=${seen} korea_rows=${korea} upserted=${upserted} db_agoda_kr=${count.rows[0].n} cid=${cid ? 'set' : 'missing'}`);
} finally {
  await client.end();
}
