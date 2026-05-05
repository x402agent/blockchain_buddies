// Embed a search query into the same vector space the catalog lives in.
// Cached in Upstash Redis by SHA1(query) so the second user typing
// "cozy night programmer" doesn't burn another OpenAI call.

import { createHash } from "node:crypto";

import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function cacheKey(text: string): string {
  return `petdex:queryvec:${createHash("sha1").update(text).digest("hex")}`;
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed || !process.env.OPENAI_API_KEY) return null;

  if (redis) {
    try {
      const cached = await redis.get<number[]>(cacheKey(trimmed));
      if (cached && Array.isArray(cached) && cached.length === 1536) {
        return cached;
      }
    } catch {
      /* fall through to OpenAI */
    }
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: trimmed.slice(0, 8000),
    });
    const v = r.data[0]?.embedding ?? null;
    if (v && redis) {
      await redis.set(cacheKey(trimmed), v, { ex: TTL_SECONDS }).catch(() => {});
    }
    return v;
  } catch {
    return null;
  }
}

/** Decide whether a search query is "vibey" enough to embed instead of
 *  doing keyword search. Heuristic: 3+ words OR ends with '?' OR
 *  contains common natural-language tokens. */
export function looksLikeVibeQuery(q: string): boolean {
  const t = q.trim();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  if (t.split(/\s+/).length >= 3) return true;
  // catch "cozy night" type two-word phrases
  if (/\s/.test(t) && t.length >= 8) return true;
  return false;
}
