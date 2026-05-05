import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./announcement-modal.tsx", import.meta.url),
  "utf8",
);

describe("AnnouncementModal theme classes", () => {
  it("does not hardcode a light modal surface while using theme text", () => {
    expect(source).not.toContain("border-border-base bg-white");
  });

  it("keeps inline search examples readable in dark mode", () => {
    const exampleClasses =
      source.match(
        /<span className="[^"]*bg-surface-muted[^"]*font-mono text-xs[^"]*">/g,
      ) ?? [];

    expect(exampleClasses).toHaveLength(2);
    for (const className of exampleClasses) {
      expect(className).toContain("text-foreground");
      expect(className).not.toContain("text-stone-900");
    }
  });
});
