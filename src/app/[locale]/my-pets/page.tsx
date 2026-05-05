import { redirect } from "next/navigation";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db, schema } from "@/lib/db/client";
import { getMetricsBySlugs } from "@/lib/db/metrics";
import { getCatchProgress } from "@/lib/catch-status";
import { handleFromClerk } from "@/lib/handles";

import { MyPetsView } from "@/components/my-pets-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myPets.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/my-pets" },
    robots: { index: false, follow: false },
  };
}

export default async function MyPetsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const rows = await db
    .select()
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.ownerId, userId))
    .orderBy(schema.submittedPets.createdAt);

  // Newest first.
  rows.reverse();

  const approvedSlugs = rows
    .filter((r) => r.status === "approved")
    .map((r) => r.slug);
  const metrics = approvedSlugs.length
    ? await getMetricsBySlugs(approvedSlugs)
    : new Map();

  const submissions = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    description: row.description,
    spritesheetUrl: row.spritesheetUrl,
    zipUrl: row.zipUrl,
    kind: row.kind,
    vibes: (row.vibes as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    featured: row.featured,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    pending: row.pendingSubmittedAt
      ? {
          displayName: row.pendingDisplayName,
          description: row.pendingDescription,
          tags: (row.pendingTags as string[] | null) ?? null,
          submittedAt: row.pendingSubmittedAt.toISOString(),
        }
      : null,
    pendingRejectionReason: row.pendingRejectionReason,
    metrics: metrics.get(row.slug) ?? {
      installCount: 0,
      zipDownloadCount: 0,
      likeCount: 0,
    },
  }));

  // Profile data for the inline editor.
  let handle = userId.slice(-8).toLowerCase();
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    handle = handleFromClerk({ username: u.username, id: u.id });
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    displayName = name || u.username || null;
    avatarUrl = u.imageUrl ?? null;
  } catch {
    /* fall back to id suffix */
  }

  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, userId),
  });
  const catchProgress = await getCatchProgress(userId);

  const approvedSummaries = submissions
    .filter((s) => s.status === "approved")
    .map((s) => ({
      slug: s.slug,
      displayName: s.displayName,
      spritesheetUrl: s.spritesheetUrl,
    }));

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-5 md:px-8 md:py-5">
        <SiteHeader />
      </section>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-20 md:px-8">
        <MyPetsView
          submissions={submissions}
          catchProgress={catchProgress}
          profile={{
            handle,
            displayName,
            avatarUrl,
            bio: profile?.bio ?? null,
            featuredPetSlugs:
              (profile?.featuredPetSlugs as string[] | undefined) ?? [],
            approvedPets: approvedSummaries,
          }}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
