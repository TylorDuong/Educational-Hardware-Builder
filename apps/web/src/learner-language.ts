type PartCategory = "compute" | "sensor" | "power" | "passive" | "fastener" | "mechanical";

const categoryTerms: Record<PartCategory, string> = {
  compute: "microcontroller board",
  sensor: "sensor",
  power: "power component",
  passive: "electronic component",
  fastener: "fastener",
  mechanical: "mechanical part",
};

/** Adds a beginner-friendly role while preserving the precise catalog name for matching and sourcing. */
export function learnerPartName(name: string, category?: PartCategory): string {
  if (/\besp32\b/i.test(name)) {
    return /\bmicrocontroller\b/i.test(name) ? name : `ESP32 microcontroller (${name})`;
  }
  if (/\bbme280\b/i.test(name)) {
    return /\bsensor\b/i.test(name) ? name : `BME280 sensor (${name})`;
  }
  const term = category ? categoryTerms[category] : undefined;
  if (!term || new RegExp(`\\b${term.replace(" ", "\\s+")}\\b`, "i").test(name)) return name;
  return `${name} (${term})`;
}

/**
 * Learner-facing prose expands common part abbreviations while leaving source
 * titles, URLs, and catalog identifiers untouched at their typed boundaries.
 */
export function learnerFriendlyText(text: string): string {
  return text
    .replace(/\bESP32(?:[-\s]+(?:DevKitC?|DevKit|compatible board))?\b(?!\s+microcontroller\b)/gi, "ESP32 microcontroller")
    .replace(/\bBME280\b(?!\s+sensor\b)/gi, "BME280 sensor");
}
