/**
 * 유튜브 Data API v3 공식 검색만 사용. 채널/영상 페이지 스크래핑 없음.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
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

const key = (process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
if (!key) {
  console.error('Set YOUTUBE_API_KEY or GOOGLE_API_KEY');
  process.exit(1);
}

const CITIES = ['서울', '부산', '제주', '경주', '전주', '가평', '속초', '강릉'];

async function search(q, duration) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '8',
    regionCode: 'KR',
    relevanceLanguage: 'ko',
    safeSearch: 'strict',
    q,
    key,
  });
  if (duration) params.set('videoDuration', duration);
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!r.ok) return [];
  const doc = await r.json();
  return (doc.items || []).map((x) => ({
    id: x.id?.videoId,
    title: x.snippet?.title || '',
    channel: x.snippet?.channelTitle || '',
    channel_id: x.snippet?.channelId || '',
    thumbnail: x.snippet?.thumbnails?.medium?.url || '',
    published_at: x.snippet?.publishedAt || null,
  })).filter((v) => v.id);
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
  for (const city of CITIES) {
    const [videos, shorts] = await Promise.all([
      search(`${city} 여행 브이로그`, 'medium'),
      search(`${city} 여행 #shorts`, 'short'),
    ]);
    const rows = [
      ...shorts.map((v) => ({ ...v, kind: 'shorts' })),
      ...videos.map((v) => ({ ...v, kind: 'video' })),
    ];
    for (const v of rows) {
      await client.query(
        `INSERT INTO place_videos(id,place_id,city,youtube_id,title,channel,channel_id,kind,thumbnail,published_at)
         VALUES ($1,'',$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (youtube_id, city) DO NOTHING`,
        [randomUUID(), city, v.id, v.title.slice(0, 180), v.channel.slice(0, 80), v.channel_id, v.kind, v.thumbnail, v.published_at],
      );
      n += 1;
    }
    console.log(city, 'videos', videos.length, 'shorts', shorts.length);
  }
  console.log('imported', n, 'youtube rows');
} finally {
  await client.end();
}
