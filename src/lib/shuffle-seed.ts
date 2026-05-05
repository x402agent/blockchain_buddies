// Per-visitor stable shuffle seed used by the curated gallery sort.
//
// Why: the default `curated` sort was deterministic for every visitor
// ("featured DESC, displayName ASC"), so pets near the front of the
// alphabet always won the homepage real-estate lottery. We seed a
// stable, per-visitor random hash so each person sees a unique
// ordering of the catalog, while keeping the order rock-stable
// across refresh + infinite scroll within a 30-day window.
//
// The cookie is minted in middleware (src/proxy.ts) since Next 16
// forbids cookies().set() from Server Components. This module is the
// read-side helper any RSC or route handler can call without owning
// the response.
//
// Issue: https://github.com/crafter-station/petdex/issues/82

import { cookies } from "next/headers";

const COOKIE_NAME = "petdex_shuffle_seed";

// 16-char hex (8 random bytes). Tight regex on read so a tampered
// cookie can't smuggle SQL fragments into ORDER BY md5(slug || $seed).
const SEED_PATTERN = /^[a-f0-9]{16}$/;

/**
 * Read the shuffle seed cookie. Returns null when the cookie is
 * missing or malformed; in that case the caller should fall back to
 * deterministic alpha ordering. The middleware mints the cookie on
 * the response so the *next* request will carry it.
 */
export async function readShuffleSeed(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  return existing && SEED_PATTERN.test(existing) ? existing : null;
}
