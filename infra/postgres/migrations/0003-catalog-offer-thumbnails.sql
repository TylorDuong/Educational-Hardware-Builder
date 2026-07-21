-- Cached vendor thumbnails keep the learner UI local-first: n8n downloads the
-- image during approved background ingestion and the browser renders this data
-- only from PostgreSQL-backed discovery data.
ALTER TABLE catalog_offers
  ADD COLUMN IF NOT EXISTS thumbnail_data_url text;

ALTER TABLE catalog_offers
  DROP CONSTRAINT IF EXISTS catalog_offers_thumbnail_data_url_check;

ALTER TABLE catalog_offers
  ADD CONSTRAINT catalog_offers_thumbnail_data_url_check
  CHECK (thumbnail_data_url IS NULL OR thumbnail_data_url ~ '^data:image/(avif|gif|jpeg|png|webp);base64,[A-Za-z0-9+/=]+$');
