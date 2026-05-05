import { NextResponse } from "next/server";

import { type CommandResult, Sandbox } from "e2b";

import { getPet } from "@/lib/pets";
import { e2bCodexRatelimit } from "@/lib/ratelimit";
import { requireSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CodexRequestBody = {
  slug?: unknown;
  petdexUrl?: unknown;
  prompt?: unknown;
  runCodex?: unknown;
};

type BuddyManifestItem = {
  slug: string;
  displayName: string;
  kind?: string;
  submittedBy?: string | null;
  spritesheetUrl: string;
  petJsonUrl: string;
  zipUrl?: string | null;
};

type BuddyAsset = BuddyManifestItem & {
  sourceUrl: string;
};

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function cleanSlug(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 80);
}

function cleanPrompt(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

function cleanHttpUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function absoluteUrl(value: string, req: Request) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return new URL(value, req.url).toString();
}

function spriteExtension(url: string) {
  const pathname = new URL(url, "https://example.com").pathname.toLowerCase();
  if (pathname.endsWith(".gif")) return "gif";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "jpg";
  if (pathname.endsWith(".webp")) return "webp";
  return "png";
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandJson(result: CommandResult) {
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error ?? null,
  };
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res.text();
}

async function fetchArrayBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res.arrayBuffer();
}

async function resolveExternalBuddy(
  slug: string,
  petdexUrl: string,
): Promise<BuddyAsset | null> {
  const manifestUrl = `${petdexUrl}/api/manifest`;
  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch Petdex manifest: HTTP ${res.status}`);
  }
  const manifest = (await res.json()) as { pets?: BuddyManifestItem[] };
  const pet = manifest.pets?.find((item) => item.slug === slug);
  return pet ? { ...pet, sourceUrl: petdexUrl } : null;
}

async function resolveBuddy(
  slug: string,
  petdexUrl: string,
  req: Request,
): Promise<BuddyAsset | null> {
  if (petdexUrl) return resolveExternalBuddy(slug, petdexUrl);

  const pet = await getPet(slug);
  if (!pet) return null;

  return {
    slug: pet.slug,
    displayName: pet.displayName,
    kind: pet.kind,
    submittedBy: pet.submittedBy?.name ?? null,
    spritesheetUrl: absoluteUrl(pet.spritesheetPath, req),
    petJsonUrl: absoluteUrl(pet.petJsonPath, req),
    zipUrl: pet.zipUrl ? absoluteUrl(pet.zipUrl, req) : null,
    sourceUrl: process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin,
  };
}

export async function POST(req: Request): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  if (!process.env.E2B_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_e2b_api_key",
        message: "Set E2B_API_KEY on the server to enable sandbox injection.",
      },
      { status: 503 },
    );
  }

  const rate = await e2bCodexRatelimit.limit(clientIp(req));
  if (!rate.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "E2B sandbox limit reached. Try again later.",
      },
      { status: 429 },
    );
  }

  let body: CodexRequestBody;
  try {
    body = (await req.json()) as CodexRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const slug = cleanSlug(body.slug);
  const petdexUrl = cleanHttpUrl(body.petdexUrl);
  const prompt = cleanPrompt(body.prompt);
  const runCodex = body.runCodex === true;

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "missing_slug", message: "Choose a buddy slug." },
      { status: 400 },
    );
  }

  if (runCodex && !process.env.CODEX_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_codex_api_key",
        message:
          "Set CODEX_API_KEY or OPENAI_API_KEY on the server to run Codex.",
      },
      { status: 503 },
    );
  }

  let sandbox: Sandbox | null = null;

  try {
    const buddy = await resolveBuddy(slug, petdexUrl, req);
    if (!buddy) {
      return NextResponse.json(
        {
          ok: false,
          error: "buddy_not_found",
          message: `No approved buddy found for "${slug}".`,
        },
        { status: 404 },
      );
    }

    const petJsonUrl = absoluteUrl(buddy.petJsonUrl, req);
    const spritesheetUrl = absoluteUrl(buddy.spritesheetUrl, req);
    const [petJson, spriteBytes] = await Promise.all([
      fetchText(petJsonUrl),
      fetchArrayBuffer(spritesheetUrl),
    ]);

    const codexApiKey = process.env.CODEX_API_KEY ?? process.env.OPENAI_API_KEY;
    sandbox = await Sandbox.create("codex", {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 10 * 60 * 1000,
      metadata: {
        app: "openclawd-blockchain-buddies",
        buddySlug: buddy.slug,
      },
      envs: {
        BLOCKCHAIN_BUDDIES_URL:
          process.env.BLOCKCHAIN_BUDDIES_URL ??
          process.env.NEXT_PUBLIC_SITE_URL ??
          "https://buddies.openclawd.biz",
        CODEX_API_KEY: codexApiKey ?? "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? codexApiKey ?? "",
      },
    });

    const ext = spriteExtension(spritesheetUrl);
    const openclawdDir = `/home/user/.openclawd/buddies/${buddy.slug}`;
    const codexDir = `/home/user/.codex/pets/${buddy.slug}`;
    const spriteFile = `spritesheet.${ext}`;

    await sandbox.commands.run(
      `mkdir -p ${shellQuote(openclawdDir)} ${shellQuote(codexDir)}`,
    );
    await sandbox.files.write(`${openclawdDir}/pet.json`, petJson);
    await sandbox.files.write(`${codexDir}/pet.json`, petJson);
    await sandbox.files.write(`${openclawdDir}/${spriteFile}`, spriteBytes);
    await sandbox.files.write(`${codexDir}/${spriteFile}`, spriteBytes);

    const openclawdManifest = JSON.stringify(
      {
        name: buddy.displayName,
        slug: buddy.slug,
        kind: buddy.kind ?? "buddy",
        source: buddy.sourceUrl,
        sourcePetJsonUrl: petJsonUrl,
        sourceSpritesheetUrl: spritesheetUrl,
        petJsonPath: `${openclawdDir}/pet.json`,
        spritesheetPath: `${openclawdDir}/${spriteFile}`,
        installedFor: "openclawd",
      },
      null,
      2,
    );
    const codexManifest = JSON.stringify(
      {
        name: buddy.displayName,
        slug: buddy.slug,
        injectedBy: "openclawd-blockchain-buddies",
        promptHint:
          "Use this buddy as the terminal companion and visual identity for Codex work.",
        petJsonPath: `${codexDir}/pet.json`,
        spritesheetPath: `${codexDir}/${spriteFile}`,
      },
      null,
      2,
    );

    await sandbox.files.write(
      `${openclawdDir}/openclawd-buddy.json`,
      openclawdManifest,
    );
    await sandbox.files.write(
      `${codexDir}/openclawd-codex.json`,
      codexManifest,
    );
    await sandbox.files.write(
      "/home/user/OPENCLAWD_BUDDY_README.txt",
      [
        `OpenClawd Blockchain Buddy: ${buddy.displayName}`,
        `Slug: ${buddy.slug}`,
        `OpenClawd path: ${openclawdDir}`,
        `Codex pet path: ${codexDir}`,
        "Run codex from this sandbox with the pet context above.",
        "",
      ].join("\n"),
    );

    const setup = await sandbox.commands.run(
      [
        `printf ${shellQuote(`Injected ${buddy.displayName} into E2B Codex sandbox\\n`)}`,
        `printf ${shellQuote(`OpenClawd buddy: ${openclawdDir}\\n`)}`,
        `printf ${shellQuote(`Codex pet: ${codexDir}\\n`)}`,
        `find ${shellQuote(openclawdDir)} -maxdepth 1 -type f -printf '%f\\n'`,
      ].join(" && "),
    );

    let codex: ReturnType<typeof commandJson> | null = null;
    if (runCodex) {
      const codexPrompt =
        prompt ||
        `Inspect the injected Blockchain Buddy at ${codexDir} and summarize how it can be used as a Codex terminal companion.`;
      const fullPrompt = [
        "You are OpenClawd Codex running inside an E2B sandbox.",
        `A Blockchain Buddy named ${buddy.displayName} has been injected at ${codexDir}.`,
        `The OpenClawd copy is at ${openclawdDir}.`,
        "Use those files as terminal companion context.",
        "",
        `User task: ${codexPrompt}`,
      ].join("\n");

      const codexResult = await sandbox.commands.run(
        `codex exec --full-auto --skip-git-repo-check ${shellQuote(fullPrompt)}`,
      );
      codex = commandJson(codexResult);
    }

    return NextResponse.json({
      ok: true,
      sandboxId: sandbox.sandboxId,
      buddy: {
        slug: buddy.slug,
        displayName: buddy.displayName,
        kind: buddy.kind ?? null,
        spritesheetUrl,
        petJsonUrl,
      },
      paths: {
        openclawdDir,
        codexDir,
      },
      setup: commandJson(setup),
      codex,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "e2b_codex_failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to prepare the E2B Codex sandbox.",
      },
      { status: 500 },
    );
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(() => {});
    }
  }
}
