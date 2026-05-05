import type { MetadataRoute } from "next";

import {
  buildAbsoluteLocaleAlternates,
  buildAbsoluteUrl,
} from "@/lib/locale-routing";
import { getAllApprovedPets } from "@/lib/pets";
import { PET_KINDS, PET_VIBES } from "@/lib/types";

export const revalidate = 3600;

type EntryInput = {
  pathname: string;
  lastModified: Date;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
};

function expandLocalizedEntry(entry: EntryInput): MetadataRoute.Sitemap {
  return [
    {
      url: buildAbsoluteUrl(entry.pathname, "en"),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: buildAbsoluteLocaleAlternates(entry.pathname),
    },
    {
      url: buildAbsoluteUrl(entry.pathname, "es"),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: buildAbsoluteLocaleAlternates(entry.pathname),
    },
    {
      url: buildAbsoluteUrl(entry.pathname, "zh"),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: buildAbsoluteLocaleAlternates(entry.pathname),
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pets = await getAllApprovedPets();
  const now = new Date();

  const staticEntries: EntryInput[] = [
    {
      pathname: "/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      pathname: "/about",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      pathname: "/docs",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      pathname: "/leaderboard",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      pathname: "/requests",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      pathname: "/create",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      pathname: "/legal/takedown",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const vibeEntries: EntryInput[] = PET_VIBES.map((vibe) => ({
    pathname: `/vibe/${vibe}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const kindEntries: EntryInput[] = PET_KINDS.map((kind) => ({
    pathname: `/kind/${kind}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const petEntries: EntryInput[] = pets.map((pet) => ({
    pathname: `/pets/${pet.slug}`,
    lastModified: pet.importedAt ? new Date(pet.importedAt) : now,
    changeFrequency: "weekly",
    priority: pet.featured ? 0.9 : 0.6,
  }));

  return [
    ...staticEntries,
    ...vibeEntries,
    ...kindEntries,
    ...petEntries,
  ].flatMap(expandLocalizedEntry);
}
