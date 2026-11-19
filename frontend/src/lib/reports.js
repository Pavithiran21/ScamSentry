/**
 * "R-1A2B": a short reference for a report, from the last four characters of its id. The API has
 * no report number; this is only a label for headings and rows (ids only, never message text).
 */
export function reportRef(id) {
  return `R-${String(id).slice(-4).toUpperCase()}`;
}
