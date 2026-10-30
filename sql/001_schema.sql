CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  sponsored BOOLEAN DEFAULT FALSE,
  amenities TEXT DEFAULT '',
  image INTEGER DEFAULT 1,
  blog_url TEXT DEFAULT '',
  blog_id TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  photo_license TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  category TEXT DEFAULT '미분류',
  address TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  photo_author TEXT DEFAULT '',
  photo_credit TEXT DEFAULT '',
  public_record BOOLEAN DEFAULT FALSE,
  partner_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  title TEXT NOT NULL,
  discount_pct INTEGER NOT NULL CHECK (discount_pct >= 1 AND discount_pct <= 40),
  expires TEXT NOT NULL,
  remaining INTEGER NOT NULL DEFAULT 999
);

CREATE TABLE IF NOT EXISTS coupon_claims (
  token TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id),
  email TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reserved_booking_id TEXT DEFAULT '',
  reserved_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  guest_name TEXT NOT NULL,
  email TEXT NOT NULL,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  guests INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  coupon_token TEXT DEFAULT '',
  status TEXT DEFAULT 'requested',
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promo_campaign_id TEXT DEFAULT '',
  promo_discount INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('guest','host')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_access (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event TEXT NOT NULL,
  property_id TEXT DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_partners (
  property_id TEXT NOT NULL REFERENCES properties(id),
  google_email TEXT NOT NULL,
  PRIMARY KEY (property_id, google_email)
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  google_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'requested'
);

CREATE TABLE IF NOT EXISTS app_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  property_id TEXT NOT NULL DEFAULT '',
  discount_kind TEXT NOT NULL CHECK (discount_kind IN ('fixed','percent')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  cap_krw INTEGER NOT NULL DEFAULT 0,
  min_spend INTEGER NOT NULL DEFAULT 0,
  min_nights INTEGER NOT NULL DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  total_claims INTEGER NOT NULL DEFAULT 0,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  per_email_limit INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','demo','active','paused','ended')),
  funded_by TEXT NOT NULL DEFAULT '',
  funding_approved BOOLEAN NOT NULL DEFAULT FALSE,
  terms_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_vouchers (
  code_hash TEXT PRIMARY KEY,
  code_prefix TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES promo_campaigns(id),
  email_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','reserved','redeemed','canceled')),
  booking_id TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reserved_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_promo_voucher_email ON promo_vouchers(campaign_id, email_hash);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);

CREATE TABLE IF NOT EXISTS promo_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
