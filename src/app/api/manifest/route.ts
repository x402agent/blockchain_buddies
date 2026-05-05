import { NextResponse } from "next/server";

import { logManifestFetch } from "@/lib/manifest-telemetry";
import { getAllApprovedPets } from "@/lib/pets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slim public manifest. Returns only the fields the CLI strictly
// needs: slug, displayName, kind, submittedBy display name, and the
// asset URLs for `petdex install`. Everything richer (description,
// tags, vibes, install command strings, page URLs, counts, source,
// IDs) lives behind /api/manifest/full which requires auth.
//
// The shape stays a JSON object with `pets: [...]` so older CLI
// versions keep working — they just won't see fields they never read.
export async function GET(req: Request): Promise<Response> {
  void logManifestFetch(req, "slim");
  const pets = await getAllApprovedPets();

  const items = pets.map((pet) => ({
    slug: pet.slug,
    displayName: pet.displayName,
    kind: pet.kind,
    submittedBy: pet.submittedBy?.name ?? null,
    spritesheetUrl: pet.spritesheetPath,
    petJsonUrl: pet.petJsonPath,
    zipUrl: pet.zipUrl ?? null,
  }));

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      total: items.length,
      pets: items,
    },
    {
      headers: {
        // Short cache so spam fetchers can still get hit by Vercel's
        // edge instead of our origin, but the data turns over every
        // minute as pets ship.
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
