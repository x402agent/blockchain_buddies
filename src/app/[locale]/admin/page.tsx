import { getTranslations } from "next-intl/server";

import { listAllSubmittedPets } from "@/lib/db/queries";
import { resolveOwnerCredits } from "@/lib/owner-credit";
import { petStates } from "@/lib/pet-states";

import { AdminReviewRow } from "@/components/admin-review-row";
import { AdminStatusFilter } from "@/components/admin-status-filter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.metadata" });

  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

type SP = { status?: string };

type Filter = "all" | "pending" | "approved" | "rejected" | "discovered";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.queue" });
  const { status } = await searchParams;
  const filter = (status ?? "pending") as Filter;

  const pets = await listAllSubmittedPets();
  // Pending and Discovered are orthogonal axes — every discovered pet
  // is also technically pending until an admin reviews it. To make
  // the queue actionable we treat 'pending' as "user-submitted +
  // pending review" only, and surface discovered rows in their own
  // tab so the admin doesn't have to wade through 170 imports to
  // find genuine new submissions.
  const counts = {
    all: pets.length,
    pending: pets.filter(
      (p) => p.status === "pending" && p.source !== "discover",
    ).length,
    approved: pets.filter((p) => p.status === "approved").length,
    rejected: pets.filter((p) => p.status === "rejected").length,
    discovered: pets.filter((p) => p.source === "discover").length,
  };

  const visible =
    filter === "all"
      ? pets
      : filter === "discovered"
        ? pets.filter((p) => p.source === "discover")
        : filter === "pending"
          ? pets.filter(
              (p) => p.status === "pending" && p.source !== "discover",
            )
          : pets.filter((p) => p.status === filter);

  // Resolve Clerk handles for every owner shown in the visible queue so
  // each row gets a /u/<handle> link without doing N round-trips. Proxy
  // owners (discover rows) point at the importer's Clerk profile, which
  // is fine here — the admin needs to land on whichever profile is
  // actually wired up, including their own.
  const credits = await resolveOwnerCredits(
    visible.map((p) => ({
      ownerId: p.ownerId,
      creditName: p.creditName,
      creditUrl: p.creditUrl,
      creditImage: p.creditImage,
    })),
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-12 md:px-8 md:pb-16">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <AdminStatusFilter counts={counts} />
      </header>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-base bg-surface/60 p-10 text-center text-sm text-muted-2">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((pet) => (
            <AdminReviewRow
              key={pet.id}
              pet={pet}
              stateCount={petStates.length}
              ownerHandle={credits.get(pet.ownerId)?.handle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
