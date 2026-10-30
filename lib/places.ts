import { dbQuery } from '@/lib/db';
import { LIST_COLUMNS, listProperty } from '@/lib/domain';
import {
  PLACE_CITIES,
  SAMPLE_PLACES,
  TRAVEL_CREATORS,
  mapsSearch,
  visitkoreaSearch,
  youtubeSearch,
  type PlaceSample,
} from '@/lib/places-catalog';
import { mapTourItem, tourApiConfigured } from '@/lib/tourapi';
import { curateCityVideos, youtubeConfigured, type CuratedVideo } from '@/lib/youtube-curate';
import { uuid } from '@/lib/hash';

export type Place = PlaceSample & {
  content_id?: string;
  tel?: string;
  homepage?: string;
  image_url?: string;
  source?: string;
};

function fromSample(s: PlaceSample): Place {
  return {
    ...s,
    image_url: `/assets/listing-${s.image}.webp`,
    source: 'sample',
  };
}

export function publicPlace(p: Place) {
  const keyword = p.keywords?.[0] || p.name;
  return {
    ...p,
    visitkorea_url: visitkoreaSearch(keyword),
    youtube_videos_url: youtubeSearch(keyword, false),
    youtube_shorts_url: youtubeSearch(keyword, true),
    maps_url: mapsSearch(p),
    href: `/place/${encodeURIComponent(p.id)}`,
    disclosure:
      p.source === 'tourapi'
        ? '한국관광공사 TourAPI 공개 자료입니다. 영업시간·요금은 현지에서 다시 확인하세요.'
        : '여행갈지도 지역 샘플입니다. 한국관광공사 검색과 유튜브 공식 API로 보강됩니다.',
  };
}

export async function listPlaces(city = '', q = '') {
  let rows: Place[] = [];
  try {
    const params: unknown[] = [];
    const clauses = ['1=1'];
    if (city) {
      params.push(city);
      clauses.push(`city=$1`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(`(name ILIKE $${params.length} OR area ILIKE $${params.length} OR keywords ILIKE $${params.length} OR overview ILIKE $${params.length})`);
    }
    const dbRows = await dbQuery(
      `SELECT * FROM places WHERE ${clauses.join(' AND ')} ORDER BY city, name LIMIT 80`,
      params,
    );
    rows = dbRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      city: String(r.city),
      area: String(r.area || ''),
      category: String(r.category || '관광지'),
      address: String(r.address || ''),
      overview: String(r.overview || ''),
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
      image: Number(r.image_index || 1),
      keywords: String(r.keywords || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      content_id: String(r.content_id || ''),
      tel: String(r.tel || ''),
      homepage: String(r.homepage || ''),
      image_url: String(r.image_url || '') || `/assets/listing-${Number(r.image_index || 1)}.webp`,
      source: String(r.source || 'sample'),
    }));
  } catch {
    rows = [];
  }
  if (!rows.length) {
    rows = SAMPLE_PLACES.filter((p) => (!city || p.city === city) && (!q || `${p.name}${p.area}${p.overview}${p.keywords.join(' ')}`.includes(q))).map(
      fromSample,
    );
  }
  return rows.map(publicPlace);
}

export async function getPlace(id: string) {
  try {
    const row = (await dbQuery(`SELECT * FROM places WHERE id=$1`, [id]))[0];
    if (row) {
      const p: Place = {
        id: String(row.id),
        name: String(row.name),
        city: String(row.city),
        area: String(row.area || ''),
        category: String(row.category || '관광지'),
        address: String(row.address || ''),
        overview: String(row.overview || ''),
        lat: row.lat != null ? Number(row.lat) : null,
        lng: row.lng != null ? Number(row.lng) : null,
        image: Number(row.image_index || 1),
        keywords: String(row.keywords || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        content_id: String(row.content_id || ''),
        tel: String(row.tel || ''),
        homepage: String(row.homepage || ''),
        image_url: String(row.image_url || '') || `/assets/listing-${Number(row.image_index || 1)}.webp`,
        source: String(row.source || 'sample'),
      };
      return publicPlace(p);
    }
  } catch {
    /* fall through to samples */
  }
  const sample = SAMPLE_PLACES.find((p) => p.id === id);
  return sample ? publicPlace(fromSample(sample)) : null;
}

export async function nearbyStays(city: string, limit = 4) {
  try {
    const rows = await dbQuery(
      `SELECT ${LIST_COLUMNS} FROM properties WHERE active=true AND city=$1 ORDER BY coalesce(review_count,0) DESC, name LIMIT $2`,
      [city, limit],
    );
    return rows.map(listProperty);
  } catch {
    return [];
  }
}

export async function listVideos(city: string, placeId = '') {
  try {
    const rows = placeId
      ? await dbQuery(`SELECT * FROM place_videos WHERE place_id=$1 OR city=$2 ORDER BY kind ASC, created_at DESC LIMIT 12`, [
          placeId,
          city,
        ])
      : await dbQuery(`SELECT * FROM place_videos WHERE city=$1 ORDER BY kind ASC, created_at DESC LIMIT 12`, [city]);
    if (rows.length) {
      return rows.map((r) => ({
        id: String(r.youtube_id),
        title: String(r.title),
        channel: String(r.channel),
        channel_id: String(r.channel_id || ''),
        thumbnail: String(r.thumbnail || `https://i.ytimg.com/vi/${r.youtube_id}/mqdefault.jpg`),
        kind: String(r.kind) === 'shorts' ? 'shorts' : 'video',
        published_at: String(r.published_at || ''),
      })) as CuratedVideo[];
    }
  } catch {
    /* table may be empty */
  }
  if (!youtubeConfigured()) return [];
  const live = await curateCityVideos(city);
  await saveVideos(city, placeId, live.videos);
  return live.videos;
}

export async function listPosts(city: string, placeId = '') {
  try {
    const rows = await dbQuery(
      `SELECT * FROM place_posts WHERE ($2='' OR place_id=$2 OR city=$1) AND city=$1 ORDER BY created_at DESC LIMIT 8`,
      [city, placeId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      url: String(r.url),
      blog_id: String(r.blog_id || ''),
      published_at: String(r.published_at || ''),
    }));
  } catch {
    return [];
  }
}

async function saveVideos(city: string, placeId: string, videos: CuratedVideo[]) {
  for (const v of videos) {
    try {
      await dbQuery(
        `INSERT INTO place_videos(id, place_id, city, youtube_id, title, channel, channel_id, kind, thumbnail, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (youtube_id, city) DO NOTHING`,
        [uuid(), placeId, city, v.id, v.title.slice(0, 180), v.channel.slice(0, 80), v.channel_id, v.kind, v.thumbnail, v.published_at || null],
      );
    } catch {
      /* unique or missing table */
    }
  }
}

export async function upsertTourPlace(item: ReturnType<typeof mapTourItem>) {
  if (!item.id || !item.name) return;
  await dbQuery(
    `INSERT INTO places(id, content_id, name, city, area, category, address, overview, tel, homepage, lat, lng, image_url, source, keywords)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'tourapi',$14)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, overview=COALESCE(NULLIF(EXCLUDED.overview,''), places.overview),
       address=EXCLUDED.address, lat=EXCLUDED.lat, lng=EXCLUDED.lng, image_url=COALESCE(NULLIF(EXCLUDED.image_url,''), places.image_url),
       homepage=EXCLUDED.homepage, tel=EXCLUDED.tel`,
    [
      item.id,
      item.content_id,
      item.name,
      item.city,
      item.area,
      item.category,
      item.address,
      item.overview,
      item.tel,
      item.homepage,
      item.lat,
      item.lng,
      item.image_url,
      item.name,
    ],
  );
}

export { PLACE_CITIES, TRAVEL_CREATORS, tourApiConfigured, youtubeConfigured };
