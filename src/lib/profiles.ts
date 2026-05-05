// Shared constants + helpers for user profiles. Centralized so the
// API, the inline editor, and the per-card pin button all agree on
// limits and types.

export const MAX_PINNED_PETS = 6;

export function dedupePins(slugs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of slugs) {
    if (typeof slug !== "string") continue;
    const v = slug.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_PINNED_PETS) break;
  }
  return out;
}
