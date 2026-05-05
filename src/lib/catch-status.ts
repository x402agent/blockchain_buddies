import { cache } from "react";

import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export const getCaughtSlugSet = cache(
  async (userId: string | null): Promise<Set<string>> => {
    if (!userId) return new Set();

    const rows = await db
      .select({ slug: schema.petLikes.petSlug })
      .from(schema.petLikes)
      .where(eq(schema.petLikes.userId, userId));

    return new Set(rows.map((row) => row.slug));
  },
);

export const getCatchProgress = cache(
  async (
    userId: string | null,
  ): Promise<{ caught: number; total: number; pct: number }> => {
    const [caughtResult, totalResult] = await Promise.all([
      userId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.petLikes)
            .where(eq(schema.petLikes.userId, userId))
        : Promise.resolve([{ count: 0 }]),
      db.execute(sql`
        SELECT count(*)::int AS count
        FROM submitted_pets
        WHERE status = 'approved'
          AND source <> 'discover'
      `) as Promise<{ rows: Array<{ count: number }> }>,
    ]);

    const caught = caughtResult[0]?.count ?? 0;
    const total = totalResult.rows[0]?.count ?? 0;
    const pct = total > 0 ? Math.round((caught / total) * 100) : 0;

    return { caught, total, pct };
  },
);
