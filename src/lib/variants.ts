import { cache } from "react";

import { and, eq, isNotNull, ne } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { getDexNumberMap } from "@/lib/dex";

export const VARIANT_DISTANCE_THRESHOLD = 14;
export const VARIANT_MAX_RESULTS = 6;

export type Variant = {
  slug: string;
  displayName: string;
  spritesheetUrl: string;
  distance: number;
  dexNumber: number | null;
};

export const getVariantsFor = cache(
  async (slug: string): Promise<Variant[]> => {
    const currentPet = await db.query.submittedPets.findFirst({
      columns: {
        slug: true,
        dhash: true,
      },
      where: and(
        eq(schema.submittedPets.slug, slug),
        eq(schema.submittedPets.status, "approved"),
      ),
    });

    if (!currentPet) {
      throw new Error("PET_NOT_FOUND");
    }

    if (!currentPet.dhash) {
      return [];
    }

    const rows = await db.query.submittedPets.findMany({
      columns: {
        slug: true,
        displayName: true,
        spritesheetUrl: true,
        dhash: true,
      },
      where: and(
        eq(schema.submittedPets.status, "approved"),
        ne(schema.submittedPets.source, "discover"),
        ne(schema.submittedPets.slug, currentPet.slug),
        isNotNull(schema.submittedPets.dhash),
      ),
    });

    const selfHash = BigInt(`0x${currentPet.dhash}`);
    const dexMap = await getDexNumberMap();

    return rows
      .flatMap((row) =>
        row.dhash
          ? [
              {
                slug: row.slug,
                displayName: row.displayName,
                spritesheetUrl: row.spritesheetUrl,
                distance: hammingDistance(selfHash, row.dhash),
                dexNumber: dexMap.get(row.slug) ?? null,
              },
            ]
          : [],
      )
      .filter((row) => row.distance <= VARIANT_DISTANCE_THRESHOLD)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, VARIANT_MAX_RESULTS);
  },
);

function hammingDistance(selfHash: bigint, otherHash: string): number {
  let xor = selfHash ^ BigInt(`0x${otherHash}`);
  let distance = 0;
  const zero = BigInt(0);
  const one = BigInt(1);

  while (xor !== zero) {
    distance += Number(xor & one);
    xor >>= one;
  }

  return distance;
}
