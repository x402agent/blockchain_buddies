import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getAllPetsPackPath } from "@/lib/downloads";
import { logManifestFetch } from "@/lib/manifest-telemetry";
import { getAllApprovedPets } from "@/lib/pets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authenticated, full-fat manifest. Only returns when the caller is
// signed in. Surfaces description, tags, vibes, install commands,
// page URLs and counts — anything richer than the slim public path.
export async function GET(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  void logManifestFetch(req, "full");

  const origin = new URL(req.url).origin;
  const pets = await getAllApprovedPets();

  const items = pets.map((pet) => ({
    slug: pet.slug,
    displayName: pet.displayName,
    description: pet.description,
    kind: pet.kind,
    vibes: pet.vibes,
    tags: pet.tags,
    featured: pet.featured ?? false,
    source: pet.source,
    submittedBy: pet.submittedBy?.name ?? null,
    installCommand: `curl -sSf ${origin}/install/${pet.slug} | sh`,
    pageUrl: `${origin}/pets/${pet.slug}`,
    spritesheetUrl: pet.spritesheetPath,
    petJsonUrl: pet.petJsonPath,
    zipUrl: pet.zipUrl ?? null,
  }));

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      total: items.length,
      featured: items.filter((p) => p.featured).length,
      allPetsPackPath: getAllPetsPackPath(),
      pets: items,
    },
    {
      headers: {
        // Per-user since this is auth-gated; no shared edge cache.
        "Cache-Control": "private, max-age=30",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
