CREATE INDEX IF NOT EXISTS idx_properties_home_rank
  ON properties (sponsored DESC, review_count DESC NULLS LAST)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_properties_active
  ON properties (id)
  WHERE active = true;
