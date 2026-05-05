import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { isAllowedAssetUrl } from "@/lib/url-allowlist";

export type ResolvedPet = {
  slug: string;
  displayName: string;
  petJsonUrl: string;
  spritesheetUrl: string;
  spriteExt: "webp" | "png";
};

export async function resolveInstallablePet(
  slug: string,
  _origin: string,
): Promise<ResolvedPet | null> {
  const submitted = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.slug, slug),
  });
  if (!submitted || submitted.status !== "approved") return null;
  // Defense in depth — even if a legacy row slipped through with an
  // off-allowlist URL, the install script must never download from it.
  // Without this, an attacker-controlled host could serve a malicious
  // pet.json plus shell-injected URL chars to break out of the curl
  // single-quotes and execute commands on every viewer who pipes the
  // script through sh.
  if (
    !isAllowedAssetUrl(submitted.petJsonUrl) ||
    !isAllowedAssetUrl(submitted.spritesheetUrl)
  ) {
    return null;
  }
  return {
    slug,
    displayName: submitted.displayName,
    petJsonUrl: submitted.petJsonUrl,
    spritesheetUrl: submitted.spritesheetUrl,
    spriteExt: submitted.spritesheetUrl.endsWith(".png") ? "png" : "webp",
  };
}

export function posixInstallScript(pet: ResolvedPet): string {
  const { slug, displayName, petJsonUrl, spritesheetUrl, spriteExt } = pet;
  // POSIX hard-quote: wrap in single-quotes and replace each ' with '\''.
  // After this every value, even something like
  //   "'; rm -rf $HOME; echo '"
  // is just an opaque string to /bin/sh.
  const q = (s: string) => `'${String(s).replace(/'/g, "'\\''")}'`;
  // Comment lines must also strip newlines so a displayName with a literal
  // \n can't break out into a fresh shell command.
  const safeName = String(displayName).replace(/[\r\n]+/g, " ");
  // Filename within $PET_DIR — strict slug already, but pin the regex so a
  // freak DB row can't produce path traversal.
  const safeSlug = String(slug).replace(/[^a-z0-9-]/g, "");
  const safeExt = spriteExt === "png" ? "png" : "webp";
  return [
    "#!/bin/sh",
    "# OpenClawd Buddies installer",
    `# https://buddies.openclawd.biz/pets/${safeSlug}`,
    "",
    "set -e",
    "",
    `PET_DIR="$HOME/.openclawd/buddies/${safeSlug}"`,
    "",
    `echo "Installing ${safeName.replace(/"/g, "")} into $PET_DIR"`,
    'mkdir -p "$PET_DIR"',
    "",
    `curl -fsSL -o "$PET_DIR/pet.json" ${q(petJsonUrl)}`,
    `curl -fsSL -o "$PET_DIR/spritesheet.${safeExt}" ${q(spritesheetUrl)}`,
    `cat > "$PET_DIR/openclawd-buddy.json" <<'JSON'`,
    JSON.stringify(
      {
        source: "blockchain-buddies",
        platform: "openclawd",
        siteUrl: "https://buddies.openclawd.biz",
        slug: safeSlug,
        displayName: safeName,
        petJsonUrl,
        spritesheetUrl,
        format: "codex-pet-v1",
      },
      null,
      2,
    ),
    "JSON",
    "",
    `echo "Installed: ${safeName.replace(/"/g, "")}"`,
    'echo "  Path: $PET_DIR"',
    'echo ""',
    'echo "OpenClawd can discover this buddy from:"',
    'echo "  $HOME/.openclawd/buddies"',
    'echo ""',
    'echo "Legacy Codex-compatible files are kept as pet.json and spritesheet.*."',
    "",
  ].join("\n");
}

export function powershellInstallScript(pet: ResolvedPet): string {
  const { slug, displayName, petJsonUrl, spritesheetUrl, spriteExt } = pet;
  // PowerShell single-quoted hard-quote: ' -> ''.
  const q = (s: string) => `'${String(s).replace(/'/g, "''")}'`;
  const safeSlug = String(slug).replace(/[^a-z0-9-]/g, "");
  const safeExt = spriteExt === "png" ? "png" : "webp";
  // Strip newlines / quotes from the display name before echoing.
  const safeName = String(displayName).replace(/[\r\n"]+/g, " ");
  return [
    "# OpenClawd Buddies installer",
    `# https://buddies.openclawd.biz/pets/${safeSlug}`,
    "",
    "$ErrorActionPreference = 'Stop'",
    `$slug = ${q(safeSlug)}`,
    "$petDir = Join-Path $HOME (Join-Path '.openclawd' (Join-Path 'buddies' $slug))",
    "",
    `Write-Host ${q(`Installing ${safeName} into `)}$petDir`,
    "New-Item -ItemType Directory -Force -Path $petDir | Out-Null",
    "",
    `Invoke-WebRequest -Uri ${q(petJsonUrl)} -OutFile (Join-Path $petDir 'pet.json') -UseBasicParsing`,
    `Invoke-WebRequest -Uri ${q(spritesheetUrl)} -OutFile (Join-Path $petDir ${q(`spritesheet.${safeExt}`)}) -UseBasicParsing`,
    `$metadata = ${q(
      JSON.stringify(
        {
          source: "blockchain-buddies",
          platform: "openclawd",
          siteUrl: "https://buddies.openclawd.biz",
          slug: safeSlug,
          displayName: safeName,
          petJsonUrl,
          spritesheetUrl,
          format: "codex-pet-v1",
        },
        null,
        2,
      ),
    )}`,
    "$metadata | Set-Content -Path (Join-Path $petDir 'openclawd-buddy.json') -Encoding UTF8",
    "",
    `Write-Host ${q(`Installed: ${safeName}`)}`,
    'Write-Host "  Path: $petDir"',
    'Write-Host ""',
    'Write-Host "OpenClawd can discover this buddy from:"',
    'Write-Host "  ~/.openclawd/buddies"',
    'Write-Host ""',
    'Write-Host "Legacy Codex-compatible files are kept as pet.json and spritesheet.*."',
    "",
  ].join("\n");
}

export function posixNotFoundScript(slug: string): string {
  const safe = String(slug).replace(/[^a-z0-9-]/g, "");
  return [
    "#!/bin/sh",
    `echo "Buddy '${safe}' not found in OpenClawd Buddies." >&2`,
    'echo "Browse buddies at https://buddies.openclawd.biz" >&2',
    "exit 1",
    "",
  ].join("\n");
}

export function powershellNotFoundScript(slug: string): string {
  const safe = String(slug).replace(/[^a-z0-9-]/g, "");
  return [
    `Write-Error "Buddy '${safe}' not found in OpenClawd Buddies."`,
    'Write-Error "Browse buddies at https://buddies.openclawd.biz"',
    "exit 1",
    "",
  ].join("\n");
}
