// Compute a perceptual hash + a semantic embedding for a single pet row
// and persist them. Designed to run server-side (Node), idempotent
// against re-runs, and fail-soft so the caller never blocks on it.
//
// Used by:
//   - /api/admin/[id] approve path (fire-and-forget after approval)
//   - scripts/compute-similarity.ts for bulk backfill

import { eq } from "drizzle-orm";
import OpenAI from "openai";
import sharp from "sharp";

import { db, schema } from "@/lib/db/client";
import { isAllowedAssetUrl } from "@/lib/url-allowlist";

const FRAME_W = 192;
const FRAME_H = 208;

export async function dhashFromSpriteUrl(
  spriteUrl: string,
): Promise<string | null> {
  if (!isAllowedAssetUrl(spriteUrl)) return null;
  try {
    const res = await fetch(spriteUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const frame = await sharp(buf)
      .extract({ left: 0, top: 0, width: FRAME_W, height: FRAME_H })
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
    let bits = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = frame[row * 9 + col];
        const right = frame[row * 9 + col + 1];
        bits += left < right ? "1" : "0";
      }
    }
    return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export async function embedPetText(args: {
  displayName: string;
  description: string;
  kind: string;
  tags: string[];
  vibes: string[];
}): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const text = [
    args.displayName,
    args.description,
    args.kind,
    args.tags.join(" "),
    args.vibes.join(" "),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);
  if (!text.trim()) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/** Persist dhash + embedding for the given pet id. */
export async function refreshSimilarityFor(petId: string): Promise<void> {
  const row = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.id, petId),
  });
  if (!row) return;

  const [hash, vec] = await Promise.all([
    dhashFromSpriteUrl(row.spritesheetUrl),
    embedPetText({
      displayName: row.displayName,
      description: row.description,
      kind: row.kind,
      tags: (row.tags as string[]) ?? [],
      vibes: (row.vibes as string[]) ?? [],
    }),
  ]);

  if (hash) {
    await db
      .update(schema.submittedPets)
      .set({ dhash: hash })
      .where(eq(schema.submittedPets.id, petId));
  }
  if (vec) {
    // Drizzle doesn't model pgvector yet; raw SQL via the neon-http driver.
    const literal = `[${vec.join(",")}]`;
    const { neon } = await import("@neondatabase/serverless");
    if (!process.env.DATABASE_URL) return;
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      UPDATE submitted_pets
      SET embedding = ${literal}::vector
      WHERE id = ${petId}
    `;
  }
}
