import Link from "next/link";

import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";

import { getCaughtSlugSet } from "@/lib/catch-status";
import { getDexNumberMap } from "@/lib/dex";
import { buildLocaleAlternates } from "@/lib/locale-routing";
import { searchPets } from "@/lib/pet-search";
import {
  getApprovedPetCount,
  getFeaturedPetsWithMetrics,
  type PetWithMetrics,
} from "@/lib/pets";
import { readShuffleSeed } from "@/lib/shuffle-seed";

import { CommandLine } from "@/components/command-line";
import { JsonLd } from "@/components/json-ld";
import { PetGallery } from "@/components/pet-gallery";
import { PetSprite } from "@/components/pet-sprite";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubmitCTA } from "@/components/submit-cta";
import { SurprisePetCard } from "@/components/surprise-pet-card";

export const dynamic = "force-dynamic";
export const metadata = {
  alternates: buildLocaleAlternates("/"),
};
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddies.openclawd.biz";

export default async function Home() {
  const { userId } = await auth();
  const t = await getTranslations("home");

  // Read the visitor's shuffle seed (minted by the middleware on the
  // very first request, so every subsequent SSR + /api/pets/search call
  // shares the same ordering). On the first visit the cookie isn't on
  // *this* request yet — searchPets falls back to alpha for that single
  // SSR, then the next navigation picks up the freshly-minted seed.
  // See lib/shuffle-seed.ts + proxy.ts for context.
  const shuffleSeed = (await readShuffleSeed()) ?? undefined;

  const [heroPets, totalPets, initialSearch, dexEntries, caughtSlugs] =
    await Promise.all([
      getFeaturedPetsWithMetrics(6),
      getApprovedPetCount(),
      searchPets({ sort: "curated", shuffleSeed }),
      getDexNumberMap(),
      getCaughtSlugSet(userId),
    ]);

  // Plain-object so the server -> client serializer doesn't choke on a
  // Map. Same source of truth either way.
  const dexMap = Object.fromEntries(dexEntries.entries());
  const caughtSlugList = Array.from(caughtSlugs);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Blockchain Buddies",
      url: `${SITE_URL}/`,
      description: t("jsonLdDescription"),
      publisher: {
        "@type": "Organization",
        name: "Crafter Station",
        url: "https://crafter.run",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}#gallery`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("jsonLdFeaturedPets"),
      numberOfItems: heroPets.length,
      itemListElement: heroPets.map((pet, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/pets/${pet.slug}`,
        name: pet.displayName,
      })),
    },
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <JsonLd data={jsonLd} />
      <SurprisePetCard />
      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />

          <div className="mt-12 flex flex-col items-center text-center md:mt-16">
            <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
              Blockchain buddies on Solana
            </p>
            <h1 className="mt-3 text-[48px] leading-[0.98] font-semibold tracking-tight md:text-[80px]">
              Blockchain Buddies
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-7 text-muted-1 md:text-lg">
              Browse animated companions, then birth your own onchain as a
              registered Metaplex Agent using OpenClawd and Helius RPC.
            </p>
            <CommandLine
              command="openclawd buddies birth --network solana-mainnet"
              source="hero"
              className="mt-5 w-full max-w-sm"
            />
          </div>

          <HeroPetParade pets={heroPets} />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <SubmitCTA className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-inverse px-6 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover">
              Submit a buddy
            </SubmitCTA>
            <Link
              href="/birth"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              Birth onchain
            </Link>
            <Link
              href="#gallery"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border-base bg-surface/70 px-6 text-sm font-medium text-foreground backdrop-blur transition hover:bg-surface"
            >
              {t("browseGallery")}
            </Link>
          </div>
        </div>
      </section>

      <section
        id="gallery"
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-12 md:px-8 md:py-16"
      >
        {totalPets > 0 ? (
          <PetGallery
            initial={initialSearch}
            totalPets={totalPets}
            dexMap={dexMap}
            caughtSlugs={caughtSlugList}
          />
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

type HeroPetParadeProps = {
  pets: PetWithMetrics[];
};

async function HeroPetParade({ pets }: HeroPetParadeProps) {
  if (pets.length === 0) return null;

  const t = await getTranslations("home");

  return (
    <section
      className="mt-10 flex flex-wrap items-end justify-center gap-3 md:gap-5"
      aria-label={t("petParadeAria")}
    >
      {pets.map((pet, index) => {
        const tilt = index % 2 === 0 ? "rotate-[-3deg]" : "rotate-[3deg]";
        const lift = index % 3 === 1 ? "translate-y-1" : "-translate-y-1";

        return (
          <Link
            key={pet.slug}
            href={`/pets/${pet.slug}`}
            aria-label={t("openPet", { name: pet.displayName })}
            className={`group relative flex flex-col items-center rounded-2xl border border-border-base bg-surface/60 px-3 pt-3 pb-2 shadow-lg shadow-blue-900/10 backdrop-blur-md transition hover:-translate-y-1 hover:bg-surface ${tilt} ${lift}`}
          >
            <PetSprite
              src={pet.spritesheetPath}
              cycleStates
              cycleIntervalMs={1500}
              scale={0.55}
              label={t("petAnimated", { name: pet.displayName })}
            />
            <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-2 uppercase">
              {pet.displayName}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
