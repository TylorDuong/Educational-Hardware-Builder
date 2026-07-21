INSERT INTO source_policies (
  id, revision, enabled, source_class, allowed_url_patterns, allowed_facts,
  refresh_interval_hours, max_staleness_hours, terms, cad_asset_rules, offer_rules
) VALUES (
  'ebay-browse-catalog', 1, true, 'vendor_catalog',
  '["https://api.ebay.com/buy/browse/**", "https://www.ebay.com/itm/**", "https://i.ebayimg.com/**"]'::jsonb,
  '["citation", "catalog_offer", "part_metadata"]'::jsonb,
  24, 48,
  '{"evidenceRequired": true, "acceptedStatuses": ["public-catalog"], "prohibitedUses": ["checkout", "credentialed-purchase", "browser-automation", "unapproved-scraping"]}'::jsonb,
  NULL,
  '{"cachedLinksOnly": true, "checkoutAllowed": false, "requireObservedAt": true, "requireExpiresAt": true, "requireProviderSku": true}'::jsonb
)
ON CONFLICT (id, revision) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  source_class = EXCLUDED.source_class,
  allowed_url_patterns = EXCLUDED.allowed_url_patterns,
  allowed_facts = EXCLUDED.allowed_facts,
  refresh_interval_hours = EXCLUDED.refresh_interval_hours,
  max_staleness_hours = EXCLUDED.max_staleness_hours,
  terms = EXCLUDED.terms,
  cad_asset_rules = EXCLUDED.cad_asset_rules,
  offer_rules = EXCLUDED.offer_rules;
