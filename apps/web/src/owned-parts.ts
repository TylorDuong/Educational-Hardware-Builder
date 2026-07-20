export type OwnedPartInput = {
  label: string;
  inventoryPartId?: string;
  matchedName?: string;
};

const catalogMatches = [
  { inventoryPartId: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db", matchedName: "ESP32 DevKit", pattern: /\besp32\b|\bdevkit\b/i },
  { inventoryPartId: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85", matchedName: "BME280 sensor", pattern: /\bbme280\b/i },
] as const;

/** Parses learner-owned kit or component labels without treating unknown text as catalog evidence. */
export function parseOwnedParts(value: string): OwnedPartInput[] {
  const seen = new Set<string>();
  return value.split(/[\n,;]+/).flatMap((rawLabel) => {
    const label = rawLabel.trim().replace(/\s+/g, " ");
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return [];
    seen.add(key);
    const match = catalogMatches.find((candidate) => candidate.pattern.test(label));
    return [match ? { label, inventoryPartId: match.inventoryPartId, matchedName: match.matchedName } : { label }];
  });
}

export function matchedInventoryPartIds(parts: readonly OwnedPartInput[]): string[] {
  return [...new Set(parts.flatMap((part) => part.inventoryPartId ? [part.inventoryPartId] : []))];
}
