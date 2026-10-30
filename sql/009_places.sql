CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  content_id TEXT DEFAULT '',
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '관광지',
  address TEXT NOT NULL DEFAULT '',
  overview TEXT NOT NULL DEFAULT '',
  tel TEXT NOT NULL DEFAULT '',
  homepage TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  image_url TEXT NOT NULL DEFAULT '',
  image_index INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'sample',
  keywords TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS places_city ON places (city, name);

CREATE TABLE IF NOT EXISTS place_videos (
  id TEXT PRIMARY KEY,
  place_id TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  channel_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'video' CHECK (kind IN ('shorts', 'video')),
  thumbnail TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS place_videos_yt_city ON place_videos (youtube_id, city);
CREATE INDEX IF NOT EXISTS place_videos_place ON place_videos (place_id, kind);

CREATE TABLE IF NOT EXISTS place_posts (
  id TEXT PRIMARY KEY,
  place_id TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  blog_id TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS place_posts_url ON place_posts (url);

CREATE TABLE IF NOT EXISTS travel_creators (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  official BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'youtube'
);
