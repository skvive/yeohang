CREATE INDEX IF NOT EXISTS idx_properties_city ON properties (city);
CREATE INDEX IF NOT EXISTS idx_properties_category_active ON properties (category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_properties_review_count ON properties (review_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
