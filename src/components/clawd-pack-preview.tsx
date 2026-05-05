import { Box, Clapperboard, Sparkles } from "lucide-react";

import { CommandLine } from "@/components/command-line";

const clawdPreviews = [
  {
    slug: "clawd-2",
    title: "Clawd 2",
    eyebrow: "next shell pass",
    description:
      "A sharper Clawd direction with bigger readable claws, $CLAWD chest detail, and stronger idle-stage presence.",
    traits: ["lobster silhouette", "Solana glow", "waving claws"],
  },
  {
    slug: "clawdex",
    title: "Clawdex",
    eyebrow: "dex operator",
    description:
      "A more terminal-native Clawd variant for the Petdex surface: tighter frame, trading-desk energy, and quick command recall.",
    traits: ["petdex-ready", "agent companion", "command-first"],
  },
];

export function ClawdPackPreview() {
  return (
    <section className="rounded-lg border border-brand-light/35 bg-surface/82 p-5 shadow-sm shadow-blue-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clapperboard className="size-4 text-brand" />
            Clawd preview pack
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-2">
            Two Clawd directions for the pet stage, using the OpenClawd mascot
            language: bigger claws, Solana accent light, and a clearer $CLAWD
            identity.
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-border-base bg-background/70 px-3 py-2 font-mono text-[11px] tracking-[0.16em] text-muted-3 uppercase">
          /pet preview
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {clawdPreviews.map((preview) => (
          <article
            key={preview.slug}
            className="grid gap-4 rounded-lg border border-border-base bg-background/72 p-4 sm:grid-cols-[132px_1fr]"
          >
            <div className="pet-checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border-base">
              <img
                src="/brand/clawd-lobster.svg"
                alt={`${preview.title} preview based on Clawd the lobster`}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.2em] text-brand uppercase">
                {preview.eyebrow}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {preview.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-2">
                {preview.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {preview.traits.map((trait) => (
                  <span
                    key={trait}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-1 text-xs font-medium text-brand dark:bg-brand-tint-dark"
                  >
                    <Sparkles className="size-3" />
                    {trait}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <CommandLine
                  command={`npx petdex install ${preview.slug}`}
                  source={`clawd-preview-${preview.slug}-petdex`}
                  className="w-full"
                />
                <CommandLine
                  command={`npx @openclawdsolana/blockchain-buddies install ${preview.slug}`}
                  source={`clawd-preview-${preview.slug}-openclawd`}
                  className="w-full"
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border-base bg-surface-muted/65 p-3 text-xs leading-5 text-muted-2">
        <Box className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          Clawd previews keep the mascot readable at pet scale: wide silhouette,
          high-contrast shell, visible claws, and command-line friendly naming.
        </p>
      </div>
    </section>
  );
}
