/**
 * Generate a short, URL-safe, unique ID.
 * Format: <prefix>_<random_base36><timestamp_base36>
 */
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36);
  return `${prefix}_${rand}${ts}`;
}
