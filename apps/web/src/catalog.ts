import {
  CatalogOfferSchema,
  CitationSchema,
  InventoryMatchSchema,
  PartRecordSchema,
  type CatalogOffer,
  type Citation,
  type InventoryMatch,
  type PartRecord,
} from "@educational-hardware-builder/schemas";

type Queryable = { query: (sql: string, values: readonly unknown[]) => Promise<{ rows: unknown[] }> };

export interface CatalogDependencies {
  pool: Queryable;
}

export interface CatalogAlternative {
  part: PartRecord;
  citation: Citation;
  relation: "compatible" | "alternative";
}

type InventoryMatchRow = {
  part_id: string;
  quantity: number | string;
  raw_label: string | null;
};

type AlternativeRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  electrical_specs: unknown;
  datasheet_url: string | null;
  cad_asset_ids: string[];
  citation: unknown;
  relation: "compatible" | "alternative";
};

type OfferRow = {
  external_id: string;
  part_id: string;
  provider: string;
  provider_sku: string;
  purchase_url: string;
  availability: "in_stock" | "out_of_stock" | "backorder" | "unknown";
  price: number | string | null;
  currency: string | null;
  thumbnail_data_url: string | null;
  observed_at: string | Date;
  expires_at: string | Date;
  source_url: string;
  citation: unknown;
};

const isoTimestamp = (value: string | Date): string => value instanceof Date ? value.toISOString() : value;

/**
 * Matches only catalog-linked inventory and aggregates quantities by canonical part.
 * Free-form inventory labels never become verified recommendation evidence.
 */
export async function findVerifiedInventoryMatches(userId: string, partIds: readonly string[], dependencies: CatalogDependencies): Promise<InventoryMatch[]> {
  if (partIds.length === 0) return [];
  const result = await dependencies.pool.query(
    `SELECT i.part_id, SUM(i.quantity)::integer AS quantity, MAX(i.raw_label) AS raw_label
       FROM user_inventory i
      WHERE i.user_id = $1
        AND i.part_id IS NOT NULL
        AND i.part_id = ANY($2::uuid[])
      GROUP BY i.part_id
      ORDER BY i.part_id`,
    [userId, partIds],
  );

  return (result.rows as InventoryMatchRow[]).map((row) => InventoryMatchSchema.parse({
    partId: row.part_id,
    verified: true,
    quantity: Number(row.quantity),
    rawLabel: row.raw_label,
  }));
}

/**
 * Returns only valid, cited alternatives whose target catalog record has provenance.
 * Deprecated, rejected, incompatible, or unlicensed records cannot enter a proposal.
 */
export async function findCompatibleAlternatives(partId: string, dependencies: CatalogDependencies): Promise<CatalogAlternative[]> {
  const result = await dependencies.pool.query(
    `SELECT p.id, p.slug, p.name, p.category, p.electrical_specs, p.datasheet_url,
            COALESCE(array_agg(DISTINCT ca.id) FILTER (WHERE ca.id IS NOT NULL), '{}') AS cad_asset_ids,
            c.citation, c.relation
       FROM compatibility_records c
       JOIN parts_catalog p ON p.id = c.target_part_id
       LEFT JOIN cad_assets ca ON ca.part_id = p.id
      WHERE c.source_part_id = $1
        AND c.relation IN ('compatible', 'alternative')
        AND c.validity_state = 'valid'
        AND NULLIF(BTRIM(p.source_url), '') IS NOT NULL
        AND NULLIF(BTRIM(p.license), '') IS NOT NULL
      GROUP BY p.id, p.slug, p.name, p.category, p.electrical_specs, p.datasheet_url, c.citation, c.relation
      ORDER BY p.name, c.relation`,
    [partId],
  );

  return (result.rows as AlternativeRow[]).map((row) => ({
    part: PartRecordSchema.parse({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      electricalSpecs: row.electrical_specs,
      datasheetUrl: row.datasheet_url ?? undefined,
      cadAssetIds: row.cad_asset_ids,
    }),
    citation: CitationSchema.parse(row.citation),
    relation: row.relation,
  }));
}

/**
 * Reads locally cached offers that are still current according to both the offer
 * and the cited source document. It intentionally performs no vendor HTTP call.
 */
export async function findFreshCatalogOffers(partIds: readonly string[], now: Date, dependencies: CatalogDependencies): Promise<CatalogOffer[]> {
  if (partIds.length === 0) return [];
  const result = await dependencies.pool.query(
    `SELECT o.external_id, o.part_id, o.provider, o.provider_sku, o.purchase_url,
            o.availability, o.price, o.currency, o.thumbnail_data_url, o.observed_at, o.expires_at,
            s.canonical_url AS source_url,
            jsonb_build_object('sourceUrl', s.canonical_url, 'locator', s.locator, 'title', s.title) AS citation
       FROM catalog_offers o
       JOIN source_documents s ON s.id = o.source_document_id
      WHERE o.part_id = ANY($1::uuid[])
        AND o.observed_at <= $2
        AND o.expires_at > $2
        AND s.expires_at > $2
        AND NULLIF(BTRIM(s.license), '') IS NOT NULL
      ORDER BY o.part_id, o.expires_at DESC, o.observed_at DESC, o.provider`,
    [partIds, now.toISOString()],
  );

  return (result.rows as OfferRow[]).map((row) => CatalogOfferSchema.parse({
    externalId: row.external_id,
    partId: row.part_id,
    provider: row.provider,
    providerSku: row.provider_sku,
    purchaseUrl: row.purchase_url,
    availability: row.availability,
    price: row.price === null ? undefined : Number(row.price),
    currency: row.currency ?? undefined,
    thumbnailDataUrl: row.thumbnail_data_url ?? undefined,
    observedAt: isoTimestamp(row.observed_at),
    expiresAt: isoTimestamp(row.expires_at),
    sourceUrl: row.source_url,
    citation: CitationSchema.parse(row.citation),
  }));
}
