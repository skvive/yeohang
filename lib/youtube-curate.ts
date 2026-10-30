import { TRAVEL_CREATORS } from '@/lib/places-catalog';

export function youtubeKey() {
  return (process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

export function youtubeConfigured() {
  return Boolean(youtubeKey());
}

export type CuratedVideo = {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  thumbnail: string;
  kind: 'shorts' | 'video';
  published_at: string;
};

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
  };
};

async function ytSearch(params: Record<string, string>) {
  const key = youtubeKey();
  if (!key) return [] as CuratedVideo[];
  const q = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '8',
    regionCode: 'KR',
    relevanceLanguage: 'ko',
    safeSearch: 'strict',
    key,
    ...params,
  });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`, { cache: 'no-store' });
  if (!r.ok) return [];
  const doc = (await r.json()) as { items?: SearchItem[] };
  const kind = params.videoDuration === 'short' ? 'shorts' : 'video';
  return (doc.items || [])
    .map((x) => ({
      id: x.id?.videoId || '',
      title: x.snippet?.title || '',
      channel: x.snippet?.channelTitle || '',
      channel_id: x.snippet?.channelId || '',
      thumbnail: x.snippet?.thumbnails?.medium?.url || x.snippet?.thumbnails?.high?.url || '',
      kind: kind as 'shorts' | 'video',
      published_at: x.snippet?.publishedAt || '',
    }))
    .filter((v) => v.id && v.title);
}

export async function curateCityVideos(city: string, keyword = '') {
  const topic = `${city} ${keyword || '국내 여행'}`.trim();
  const [videos, shorts] = await Promise.all([
    ytSearch({ q: `${topic} 브이로그`, videoDuration: 'medium' }),
    ytSearch({ q: `${topic} #shorts`, videoDuration: 'short' }),
  ]);
  const seen = new Set<string>();
  const out: CuratedVideo[] = [];
  for (const v of [...shorts, ...videos]) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
    if (out.length >= 12) break;
  }
  return { videos: out, creators: TRAVEL_CREATORS, engine: youtubeConfigured() ? 'youtube-data-api' : 'links-only' };
}

export async function curatePlaceVideos(placeName: string, city: string) {
  return curateCityVideos(city, placeName);
}
