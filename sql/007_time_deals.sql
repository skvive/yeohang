CREATE TABLE IF NOT EXISTS time_deals (
  token TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES properties(id),
  stay_name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'site',
  character_id TEXT NOT NULL DEFAULT 'goblin',
  amount_krw INTEGER NOT NULL DEFAULT 5000,
  min_spend_krw INTEGER NOT NULL DEFAULT 150000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'clicked', 'expired', 'paid')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  clicked_at TIMESTAMPTZ,
  booked_ref TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_deals_stay_started ON time_deals (stay_id, started_at DESC);
CREATE INDEX IF NOT EXISTS time_deals_expires ON time_deals (expires_at);
CREATE INDEX IF NOT EXISTS time_deals_status ON time_deals (status);
