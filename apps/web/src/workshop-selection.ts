/** Clicking the active part or the empty canvas exits the focused inspection state. */
export function nextSelectedPartId(
  currentPartId: string | undefined,
  requestedPartId: string | undefined,
): string | undefined {
  return requestedPartId === undefined || requestedPartId === currentPartId
    ? undefined
    : requestedPartId;
}
