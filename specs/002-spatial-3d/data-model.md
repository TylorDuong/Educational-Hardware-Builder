# Data Model: B2 Part Metadata

## CAD Asset Metadata

- `id` and `partId`: stable UUID identifiers.
- `filePath`: the curated asset or fixture location.
- `sourceUrl` and `license`: provenance required before shipping.
- `matingFeatures`: named physical features with millimetre positions and, where applicable,
  a diameter and normal.

## Validation Rules

- The source URL and license are mandatory.
- Feature IDs are non-empty and unique within the curated record set.
- Positions are fixed three-axis values and hole diameters are positive.
