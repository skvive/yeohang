ALTER TABLE properties ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'seed';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS agoda_hotel_id BIGINT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS agoda_city_id BIGINT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS star_rating DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS review_score DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS review_count INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS affiliate_url TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_agoda_hotel
  ON properties (agoda_hotel_id)
  WHERE agoda_hotel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_source_country
  ON properties (source, country_code);

CREATE INDEX IF NOT EXISTS idx_properties_agoda_city
  ON properties (agoda_city_id)
  WHERE agoda_city_id IS NOT NULL;
