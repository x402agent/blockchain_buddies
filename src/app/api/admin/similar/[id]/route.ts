// Admin-only: list pets that look similar to a given pending submission.
// Combines two signals so the admin sees both visual dupes ("same sprite,
// different name") and semantic dupes ("different sprite, both depict
// Naruto").
//
// Visual: 64-bit dHash, hamming distance up to 14 bits (~22% of bits).
// Semantic: text-embedding-3-small cosine similarity >= 0.78.
//
// Curated/featured matches always appear first. Approved before pending.

import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

type Params = { id: string };

// Visual hamming threshold. 0 = identical, 64 = inverted. 14 ≈ ~22%
// of bits flipped — empirically the boundary between "obvious dupe"
// and "merely similar style".
const VISUAL_THRESHOLD = 14;
// Cosine similarity threshold (0..1). Calibrated against the live
// catalog: at 0.75 we catch every same-character dupe (clippy-N,
// wall-e-N, luffy-N, dobby-N, plus pepe ↔ apupepe) without firing
// on mere style overlaps.
const SEMANTIC_THRESHOLD = 0.75;
const MAX_RESULTS = 12;

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const sql = neon(
  process.env.DATABASE_URL ??
    "postgres://missing:missing@localhost:5432/missing",
);

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl) {
    return NextResponse.json(
      { error: "database_unconfigured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;

  const [target] = (await sql`
    SELECT id, slug, display_name, dhash,
           (embedding IS NOT NULL) as has_embedding
    FROM submitted_pets WHERE id = ${id}
  `) as Array<{
    id: string;
    slug: string;
    display_name: string;
    dhash: string | null;
    has_embedding: boolean;
  }>;

  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Two queries, then merge by id and surface the strongest signal.
  // Postgres's bit_count would need pgcrypto; we hex-decode in app.
  const [visualRows, semanticRows] = await Promise.all([
    target.dhash
      ? findVisualSimilar(target.id, target.dhash)
      : Promise.resolve([] as VisualMatch[]),
    target.has_embedding
      ? findSemanticSimilar(target.id)
      : Promise.resolve([] as SemanticMatch[]),
  ]);

  const merged = new Map<string, MergedHit>();
  for (const v of visualRows) {
    merged.set(v.id, {
      id: v.id,
      slug: v.slug,
      displayName: v.display_name,
      status: v.status,
      featured: v.featured,
      spritesheetUrl: v.spritesheet_url,
      visualDistance: v.distance,
      semanticScore: null,
    });
  }
  for (const s of semanticRows) {
    const existing = merged.get(s.id);
    if (existing) {
      existing.semanticScore = s.score;
    } else {
      merged.set(s.id, {
        id: s.id,
        slug: s.slug,
        displayName: s.display_name,
        status: s.status,
        featured: s.featured,
        spritesheetUrl: s.spritesheet_url,
        visualDistance: null,
        semanticScore: s.score,
      });
    }
  }

  // Rank: identical-or-near-visual first, then semantic+visual combo,
  // then pure semantic. Featured / approved before pending.
  const ranked = [...merged.values()]
    .sort((a, b) => {
      const aFeat = a.featured ? 0 : 1;
      const bFeat = b.featured ? 0 : 1;
      if (aFeat !== bFeat) return aFeat - bFeat;
      const aApp = a.status === "approved" ? 0 : 1;
      const bApp = b.status === "approved" ? 0 : 1;
      if (aApp !== bApp) return aApp - bApp;
      return strengthScore(b) - strengthScore(a);
    })
    .slice(0, MAX_RESULTS);

  return NextResponse.json({
    target: {
      id: target.id,
      slug: target.slug,
      displayName: target.display_name,
    },
    matches: ranked,
  });
}

type VisualMatch = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  featured: boolean;
  spritesheet_url: string;
  distance: number;
};

async function findVisualSimilar(
  selfId: string,
  selfHash: string,
): Promise<VisualMatch[]> {
  // Pull every other row's dhash, then compute hamming in JS — at 341
  // pets this is microseconds. When the catalog crosses ~5k we'll move
  // to a SQL window function with bit_count.
  const rows = (await sql`
    SELECT id, slug, display_name, status, featured, spritesheet_url, dhash
    FROM submitted_pets
    WHERE dhash IS NOT NULL AND id <> ${selfId}
      AND status IN ('approved','pending')
  `) as Array<{
    id: string;
    slug: string;
    display_name: string;
    status: string;
    featured: boolean;
    spritesheet_url: string;
    dhash: string;
  }>;

  const out: VisualMatch[] = [];
  const ZERO = BigInt(0);
  const ONE = BigInt(1);
  const selfBig = BigInt(`0x${selfHash}`);
  for (const r of rows) {
    let xor = selfBig ^ BigInt(`0x${r.dhash}`);
    let distance = 0;
    while (xor !== ZERO) {
      distance += Number(xor & ONE);
      xor >>= ONE;
    }
    if (distance <= VISUAL_THRESHOLD) {
      out.push({
        id: r.id,
        slug: r.slug,
        display_name: r.display_name,
        status: r.status,
        featured: r.featured,
        spritesheet_url: r.spritesheet_url,
        distance,
      });
    }
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

type SemanticMatch = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  featured: boolean;
  spritesheet_url: string;
  score: number;
};

async function findSemanticSimilar(selfId: string): Promise<SemanticMatch[]> {
  // <=> is cosine distance in pgvector. We invert to similarity (1 - d).
  const rows = (await sql`
    SELECT id, slug, display_name, status, featured, spritesheet_url,
           1 - (embedding <=> (SELECT embedding FROM submitted_pets WHERE id = ${selfId})) AS similarity
    FROM submitted_pets
    WHERE embedding IS NOT NULL
      AND id <> ${selfId}
      AND status IN ('approved','pending')
    ORDER BY similarity DESC
    LIMIT 30
  `) as Array<{
    id: string;
    slug: string;
    display_name: string;
    status: string;
    featured: boolean;
    spritesheet_url: string;
    similarity: number;
  }>;
  return rows
    .filter((r) => r.similarity >= SEMANTIC_THRESHOLD)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      display_name: r.display_name,
      status: r.status,
      featured: r.featured,
      spritesheet_url: r.spritesheet_url,
      score: r.similarity,
    }));
}

type MergedHit = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  featured: boolean;
  spritesheetUrl: string;
  visualDistance: number | null;
  semanticScore: number | null;
};

function strengthScore(m: MergedHit): number {
  // Bigger = more suspicious. Visual identity dominates.
  let score = 0;
  if (m.visualDistance !== null) {
    score += (VISUAL_THRESHOLD - m.visualDistance) * 5;
  }
  if (m.semanticScore !== null) {
    score += (m.semanticScore - SEMANTIC_THRESHOLD) * 100;
  }
  return score;
}
