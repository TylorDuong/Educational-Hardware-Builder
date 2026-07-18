import {
  InventoryPartSchema,
  type InventoryPart,
} from "@educational-hardware-builder/schemas";

type Queryable = { query: (sql: string, values: readonly unknown[]) => Promise<{ rows: unknown[] }> };

export interface InventoryDependencies {
  pool: Queryable;
}

type InventoryRow = {
  inventory_id: string;
  quantity: number;
  raw_label: string | null;
  part_id: string | null;
  slug: string | null;
  name: string | null;
  category: string | null;
  electrical_specs: unknown;
  datasheet_url: string | null;
};

/**
 * The real inventory boundary: unverified free-form rows remain visible but cannot
 * be represented as verified catalog parts. This prevents agent prompts from
 * treating a label as an authoritative component record.
 */
export async function listInventoryParts(userId: string, dependencies: InventoryDependencies): Promise<InventoryPart[]> {
  const result = await dependencies.pool.query(
    `SELECT i.id AS inventory_id, i.quantity, i.raw_label,
            p.id AS part_id, p.slug, p.name, p.category, p.electrical_specs, p.datasheet_url
       FROM user_inventory i
       LEFT JOIN parts_catalog p ON p.id = i.part_id
      WHERE i.user_id = $1
      ORDER BY p.name NULLS LAST, i.raw_label NULLS LAST`,
    [userId],
  );

  return (result.rows as InventoryRow[]).map((row) => InventoryPartSchema.parse({
    inventoryId: row.inventory_id,
    quantity: row.quantity,
    rawLabel: row.raw_label,
    verified: row.part_id !== null,
    part: row.part_id === null ? null : {
      id: row.part_id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      electricalSpecs: row.electrical_specs,
      datasheetUrl: row.datasheet_url ?? undefined,
      cadAssetIds: [],
    },
  }));
}
