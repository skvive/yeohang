ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_krw INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS ad_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_krw INTEGER NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'once')),
  slot TEXT NOT NULL DEFAULT 'ai_search',
  features TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  query TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ad_events_property_created ON ad_events (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ad_events_kind_created ON ad_events (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_property_status ON subscriptions (property_id, status);

INSERT INTO ad_products (id, name, amount_krw, interval, slot, features, active)
VALUES
  ('motel-search', '모텔·여관 AI 검색 광고', 49000, 'month', 'ai_search', 'AI 답변 광고 1칸,월간 노출·클릭 리포트,검색 CPC 추정', true),
  ('pension-search', '펜션·풀빌라 AI 검색 광고', 79000, 'month', 'ai_search', 'AI 답변 광고 1칸,지역 매칭 우선,월간 노출·클릭 리포트', true),
  ('starter', '기본 광고', 59000, 'month', 'search', '숙소 기본 노출,블로그 연결,월간 조회 리포트', true),
  ('growth', '성장 프리미엄', 149000, 'month', 'ai_search', '스폰서 검색 카드,AI 추천 후보,쿠폰·영상 큐레이션,전환 리포트', true),
  ('signature', '대표 파트너', 349000, 'month', 'ai_search', '프리미엄 스폰서 영역,브랜드 슬롯,상담 리드,우선 지원', true),
  ('content-pack', '콘텐츠 세팅 패키지', 290000, 'once', 'content', '블로그 구성 지원,이미지 권리 검수,검색 메타데이터', true)
ON CONFLICT (id) DO NOTHING;
