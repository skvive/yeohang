import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable, Transform } from 'node:stream';
import { createInflateRaw } from 'node:zlib';
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

const DEFAULT_FEED = 'https://affiliatefeed.agoda.com/hoteldatafiles/E342B777-64FD-4A49-9C9F-FEF4BA635863_KO.zip';
const file = process.argv[2] || '';
const feedUrl = (process.env.AGODA_HOTEL_FEED_URL || DEFAULT_FEED).trim();
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
  const blob = [
    row.countryiso,
    row.countryiso2,
    row.country_iso,
    row.countryisocode,
    row.country_iso_code,
    row.iso2,
    row.countrycode,
    row.country_code,
    row.countryname,
    row.country_name,
    row.country,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\bkr\b|\bkor\b|south korea|korea, republic|대한민국|한국/.test(blob) && !/north korea|dprk|북한/.test(blob);
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const CITY_KO = {
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
};

function cityKo(raw) {
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

function preferKo(...vals) {
  const filled = vals.map((v) => String(v || '').trim()).filter(Boolean);
  return filled.find((v) => /[가-힣]/.test(v)) || filled[0] || '';
}

function latinOnly(s) {
  return /[A-Za-z]/.test(s) && !/[가-힣]/.test(s);
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

function httpsPhoto(v) {
  if (!v) return '';
  if (v.startsWith('//')) return `https:${v}`;
  if (v.startsWith('http://')) return `https://${v.slice(7)}`;
  return v;
}

class ZipFirstFile extends Transform {
  constructor() {
    super();
    this.buf = Buffer.alloc(0);
    this.inflater = null;
    this.passthrough = false;
    this.started = false;
  }
  _transform(chunk, _enc, cb) {
    try {
      if (this.passthrough) {
        this.push(chunk);
        cb();
        return;
      }
      if (this.inflater) {
        this.inflater.write(chunk);
        cb();
        return;
      }
      this.buf = Buffer.concat([this.buf, chunk]);
      if (this.buf.length < 30) {
        cb();
        return;
      }
      const sig = this.buf.readUInt32LE(0);
      if (sig !== 0x04034b50) {
        cb(new Error('not a zip local file (got ' + sig.toString(16) + ')'));
        return;
      }
      const flags = this.buf.readUInt16LE(6);
      const method = this.buf.readUInt16LE(8);
      const nameLen = this.buf.readUInt16LE(26);
      const extraLen = this.buf.readUInt16LE(28);
      const headerLen = 30 + nameLen + extraLen;
      if (this.buf.length < headerLen) {
        cb();
        return;
      }
      const name = this.buf.subarray(30, 30 + nameLen).toString('utf8');
      console.log(`zip entry method=${method} flags=${flags} name=${name}`);
      const rest = this.buf.subarray(headerLen);
      this.buf = Buffer.alloc(0);
      this.started = true;
      if (method === 0) {
        this.passthrough = true;
        if (rest.length) this.push(rest);
      } else if (method === 8) {
        this.inflater = createInflateRaw();
        this.inflater.on('data', (d) => this.push(d));
        this.inflater.on('error', (err) => {
          this.inflateErr = err;
        });
        if (rest.length) this.inflater.write(rest);
      } else {
        cb(new Error('unsupported zip method ' + method));
        return;
      }
      cb();
    } catch (err) {
      cb(err);
    }
  }
  _flush(cb) {
    if (!this.inflater) {
      cb();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cb();
    };
    this.inflater.once('end', finish);
    this.inflater.once('error', finish);
    this.inflater.end();
  }
}

async function openCsvStream() {
  if (file && !/\.zip$/i.test(file)) {
    console.log('reading csv', file);
    return createReadStream(file);
  }
  if (file && /\.zip$/i.test(file)) {
    console.log('reading zip', file);
    const zip = new ZipFirstFile();
    createReadStream(file).pipe(zip);
    return zip;
  }
  console.log('downloading hotel feed');
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 yeohang-agoda-import', Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error('feed HTTP ' + res.status);
  const len = res.headers.get('content-length');
  console.log('feed status', res.status, 'bytes', len || 'unknown');
  const zip = new ZipFirstFile();
  Readable.fromWeb(res.body).pipe(zip);
  return zip;
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

let headers = [];
let seen = 0;
let korea = 0;
let upserted = 0;
const batch = [];
let partial = false;

async function flush() {
  if (!batch.length) return;
  const rows = batch.splice(0, batch.length);
  const values = [];
  const binds = [];
  let i = 1;
  for (const r of rows) {
    binds.push(
      `($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`,
    );
    values.push(
      r.id,
      r.name,
      r.city,
      r.area,
      r.tagline,
      r.description,
      1,
      r.lat,
      r.lng,
      r.amenities,
      r.photo_url,
      r.category,
      r.address,
      r.source_url,
      r.photo_author,
      r.photo_credit,
      r.photo_license,
      r.agoda_hotel_id,
      r.agoda_city_id,
      r.star_rating,
      r.review_score,
      r.review_count,
      r.affiliate_url,
    );
  }
  await client.query(
    `INSERT INTO properties (
      id, name, city, area, tagline, description, price, lat, lng, amenities,
      photo_url, category, address, source_url, photo_author, photo_credit, photo_license,
      agoda_hotel_id, agoda_city_id, star_rating, review_score, review_count, affiliate_url,
      source, country_code, public_record, partner_verified, verified, active, sponsored
    ) SELECT
      x.id::text, x.name::text, x.city::text, x.area::text, x.tagline::text, x.description::text,
      x.price::int, x.lat::float8, x.lng::float8, x.amenities::text,
      x.photo_url::text, x.category::text, x.address::text, x.source_url::text, x.photo_author::text,
      x.photo_credit::text, x.photo_license::text, x.agoda_hotel_id::bigint,
      x.agoda_city_id::bigint, x.star_rating::float8, x.review_score::float8,
      x.review_count::int, x.affiliate_url::text,
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
  const input = await openCsvStream();
  input.on('error', (err) => {
    partial = true;
    console.warn('stream error', err.message);
  });
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!headers.length) {
      headers = parseCsvLine(line).map(norm);
      console.log('columns', headers.slice(0, 12).join(','));
      continue;
    }
    seen += 1;
    if (seen % 200000 === 0) console.log(`scanned=${seen} korea=${korea} upserted=${upserted}`);
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, ix) => {
      row[h] = cols[ix] || '';
    });
    if (!isKorea(row)) continue;
    const hotelId = pick(row, ['hotelid', 'hotel_id', 'hid']);
    if (!hotelId || !/^\d+$/.test(hotelId)) continue;
    korea += 1;
    const name =
      preferKo(
        pick(row, ['hotel_translated_name', 'translatedname', 'translated_name']),
        pick(row, ['hotelname', 'hotel_name']),
      ) || `아고다 ${hotelId}`;
    const city = cityKo(
      preferKo(pick(row, ['citytranslated', 'city_translated']), pick(row, ['cityname', 'city_name', 'city'])),
    );
    const area =
      cityKo(preferKo(pick(row, ['areatranslated', 'area_translated']), pick(row, ['areaname', 'area_name', 'area']))) ||
      city;
    const address = preferKo(
      pick(row, ['addressline1_translated', 'translated_address', 'address_translated']),
      pick(row, ['addressline1', 'address_line_1', 'address']),
    );
    const descRaw = preferKo(pick(row, ['overview', 'description', 'hoteldescription', 'overviewtranslated']));
    const cat = categoryOf(pick(row, ['accommodationtype', 'accommodation_type', 'propertytype', 'property_type']) || name);
    const desc = !descRaw || latinOnly(descRaw) ? `${city || '한국'}에 있는 ${cat}입니다. 상세 안내는 아고다에서 확인하세요.` : descRaw;
    const photo = httpsPhoto(pick(row, ['photo1', 'photo_1', 'imageurl', 'image_url', 'hotelpicture']));
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
      tagline: [city, cat].filter(Boolean).join(' · ') || '아고다 제휴 숙소',
      description: desc.slice(0, 2000),
      lat: num(lat),
      lng: num(lng),
      amenities: cat,
      photo_url: photo,
      category: cat,
      address,
      source_url: hotelUrl,
      photo_author: '아고다',
      photo_credit: hotelUrl,
      photo_license: '아고다 제휴 콘텐츠',
      agoda_hotel_id: num(hotelId),
      agoda_city_id: num(cityId),
      star_rating: num(stars),
      review_score: num(score),
      review_count: num(reviews),
      affiliate_url: affiliateUrl(hotelId),
    });
    if (batch.length >= 200) await flush();
    if (korea % 2000 === 0) console.log(`korea=${korea} upserted=${upserted} scanned=${seen}`);
  }
  await flush();
  const count = await client.query(`SELECT COUNT(*)::int AS n FROM properties WHERE source='agoda' AND country_code='KR'`);
  console.log(
    `done scanned=${seen} korea_rows=${korea} upserted=${upserted} db_agoda_kr=${count.rows[0].n} cid=${cid ? 'set' : 'missing'} partial=${partial}`,
  );
  if (korea === 0) process.exitCode = 2;
} catch (err) {
  await flush().catch(() => {});
  console.error('import failed', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
