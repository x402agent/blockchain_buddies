import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import * as p from "@clack/prompts";
import JSZip from "jszip";
import pc from "picocolors";

import { ClerkCliAuth } from "../src/cli-auth/index.js";

// ─── config ────────────────────────────────────────────────────────────────
const CLI_NAME = "blockchain-buddies";
const SHORT_CLI_NAME = "buddies";
const SITE_URL =
  process.env.BLOCKCHAIN_BUDDIES_URL ??
  process.env.BUDDIES_URL ??
  process.env.PETDEX_URL ??
  "https://buddies.openclawd.biz";
const CLERK_ISSUER =
  process.env.BLOCKCHAIN_BUDDIES_CLERK_ISSUER ??
  process.env.CLERK_CLI_ISSUER ??
  process.env.CLERK_ISSUER ??
  "";
const CLIENT_ID =
  process.env.BLOCKCHAIN_BUDDIES_CLERK_CLIENT_ID ??
  process.env.CLERK_OAUTH_CLIENT_ID ??
  "";
const BUDDIES_DIR =
  process.env.OPENCLAWD_BUDDIES_DIR ??
  process.env.BLOCKCHAIN_BUDDIES_DIR ??
  path.join(homedir(), ".openclawd", "buddies");
const CODEX_PETS_DIR =
  process.env.CODEX_PETS_DIR ?? path.join(homedir(), ".codex", "pets");

let authClient: ClerkCliAuth | null = null;

function auth(): ClerkCliAuth {
  if (!CLIENT_ID || !CLERK_ISSUER) {
    throw new Error(
      [
        "CLI auth is not configured.",
        "Set BLOCKCHAIN_BUDDIES_CLERK_CLIENT_ID and BLOCKCHAIN_BUDDIES_CLERK_ISSUER",
        "or the compatible CLERK_OAUTH_CLIENT_ID and CLERK_CLI_ISSUER variables.",
      ].join(" "),
    );
  }
  authClient ??= new ClerkCliAuth({
    clientId: CLIENT_ID,
    issuer: CLERK_ISSUER,
    scopes: ["profile", "email", "openid", "offline_access"],
    storage: "keychain",
    keychainService: "blockchain-buddies-cli",
    environment: "openclawd",
  });
  return authClient;
}

const VERSION = "0.1.0";

// ─── entrypoint ────────────────────────────────────────────────────────────
main().catch((err) => {
  p.cancel(`${CLI_NAME}: ${(err as Error).message}`);
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }

  switch (cmd) {
    case "login":
      await cmdLogin();
      break;
    case "logout":
      await cmdLogout();
      break;
    case "whoami":
      await cmdWhoami();
      break;
    case "submit":
      await cmdSubmit(args.slice(1));
      break;
    case "install":
      await cmdInstall(args.slice(1));
      break;
    case "list":
      await cmdList();
      break;
    case "codex":
      await cmdCodex(args.slice(1));
      break;
    case "metaplex":
      await cmdMetaplex(args.slice(1));
      break;
    case "petdex":
      await cmdPetdex(args.slice(1));
      break;
    case "version":
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    default:
      console.error(pc.red(`Unknown command: ${cmd}`));
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  const c = pc.cyan;
  const dim = pc.dim;
  console.log(
    [
      "",
      `  ${pc.bold(pc.magenta(CLI_NAME))} ${dim(VERSION)} ${dim("— OpenClawd buddy CLI")}`,
      "",
      `  ${c("Usage")}`,
      `    ${CLI_NAME} <command> [args]`,
      `    ${SHORT_CLI_NAME} <command> [args]`,
      "",
      `  ${c("Commands")}`,
      `    ${pc.bold("login")}              Sign in with Clerk OAuth`,
      `    ${pc.bold("logout")}             Clear stored credentials`,
      `    ${pc.bold("whoami")}             Show signed-in user`,
      `    ${pc.bold("submit")} <path>      Submit a buddy folder, zip, or parent folder (bulk)`,
      `    ${pc.bold("install")} <slug>     Install a buddy into ${BUDDIES_DIR}/<slug>`,
      `    ${pc.bold("list")}               List approved buddies`,
      `    ${pc.bold("codex")} <cmd>         Sync buddies into OpenAI Codex-compatible pets`,
      `    ${pc.bold("metaplex")} metadata   Generate Metaplex Agent Registry metadata`,
      `    ${pc.bold("petdex")} <cmd>        Run Petdex-compatible legacy commands`,
      "",
      `  ${c("Examples")}`,
      `    ${dim("$")} ${CLI_NAME} login`,
      `    ${dim("$")} ${CLI_NAME} submit ${BUDDIES_DIR}/boba       ${dim("# single folder")}`,
      `    ${dim("$")} ${CLI_NAME} submit ~/Downloads/boba.zip     ${dim("# zip file")}`,
      `    ${dim("$")} ${CLI_NAME} submit ${BUDDIES_DIR}            ${dim("# bulk all subfolders")}`,
      `    ${dim("$")} ${CLI_NAME} install boba`,
      `    ${dim("$")} ${CLI_NAME} codex install boba`,
      `    ${dim("$")} ${CLI_NAME} metaplex metadata boba --out agent.json`,
      "",
      `  ${dim("Gallery & docs:")} ${pc.underline(SITE_URL)}`,
      "",
    ].join("\n"),
  );
}

// ─── commands ──────────────────────────────────────────────────────────────

async function cmdLogin() {
  p.intro(pc.bgMagenta(pc.white(` ${CLI_NAME} login `)));
  const s = p.spinner();
  s.start("Opening your browser to sign in with Clerk");
  try {
    const { user } = await auth().login();
    s.stop(pc.green("✓ ") + `Signed in as ${pc.cyan(userLabel(user))}`);
    p.outro(`Try ${pc.cyan(`${CLI_NAME} submit ${BUDDIES_DIR}`)} to share your buddies.`);
  } catch (err) {
    s.stop(pc.red("× login failed"));
    throw err;
  }
}

async function cmdCodex(args: string[]) {
  const action = args[0];
  if (!action || action === "--help" || action === "-h") {
    console.log(
      [
        "",
        `  ${pc.bold("OpenAI Codex integration")}`,
        "",
        `    ${CLI_NAME} codex install <slug>  Install from Blockchain Buddies and sync to ${CODEX_PETS_DIR}`,
        `    ${CLI_NAME} codex sync [slug]     Sync one installed buddy, or all buddies, into Codex`,
        "",
      ].join("\n"),
    );
    return;
  }

  if (action === "install") {
    const slug = args[1];
    if (!slug) {
      p.cancel(`Usage: ${pc.cyan(`${CLI_NAME} codex install <slug>`)}`);
      process.exit(1);
    }
    await cmdInstall([slug]);
    await syncBuddyToCodex(slug);
    return;
  }

  if (action === "sync") {
    const slug = args[1];
    if (slug) {
      await syncBuddyToCodex(slug);
      return;
    }
    const entries = await readdir(BUDDIES_DIR, { withFileTypes: true }).catch(
      () => [],
    );
    let count = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      await syncBuddyToCodex(entry.name);
      count++;
    }
    console.log(pc.green("✓ ") + `Synced ${count} buddies into ${CODEX_PETS_DIR}`);
    return;
  }

  p.cancel(`Unknown codex command: ${action}`);
  process.exit(1);
}

async function syncBuddyToCodex(slug: string): Promise<void> {
  const sourceDir = path.join(BUDDIES_DIR, slug);
  const targetDir = path.join(CODEX_PETS_DIR, slug);
  if (!(await fileExists(path.join(sourceDir, "pet.json")))) {
    throw new Error(`Buddy is not installed in ${sourceDir}. Run ${CLI_NAME} install ${slug}.`);
  }
  await mkdir(targetDir, { recursive: true });
  await copyFile(path.join(sourceDir, "pet.json"), path.join(targetDir, "pet.json"));

  const sprite = (await fileExists(path.join(sourceDir, "spritesheet.webp")))
    ? "spritesheet.webp"
    : "spritesheet.png";
  if (!(await fileExists(path.join(sourceDir, sprite)))) {
    throw new Error(`Missing spritesheet for ${slug} in ${sourceDir}`);
  }
  await copyFile(path.join(sourceDir, sprite), path.join(targetDir, sprite));
  await writeFile(
    path.join(targetDir, "openclawd-codex.json"),
    `${JSON.stringify(
      {
        source: "blockchain-buddies",
        platform: "openai-codex",
        openClawdBuddyDir: sourceDir,
        syncedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(pc.green("✓ ") + `Codex-ready buddy synced to ${pc.cyan(targetDir)}`);
}

async function cmdMetaplex(args: string[]) {
  const action = args[0];
  if (!action || action === "--help" || action === "-h") {
    console.log(
      [
        "",
        `  ${pc.bold("Metaplex integration")}`,
        "",
        `    ${CLI_NAME} metaplex metadata <slug|path> [--out file]`,
        "",
        "  Generates offline Agent Registry metadata for a buddy package.",
        "  It does not mint, sign, or submit Solana transactions.",
        "",
      ].join("\n"),
    );
    return;
  }
  if (action !== "metadata") {
    p.cancel(`Unknown metaplex command: ${action}`);
    process.exit(1);
  }

  const target = args[1];
  if (!target) {
    p.cancel(`Usage: ${pc.cyan(`${CLI_NAME} metaplex metadata <slug|path> [--out file]`)}`);
    process.exit(1);
  }
  const outIndex = args.indexOf("--out");
  const outFile = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const metadata = await buildMetaplexMetadata(target);
  const json = `${JSON.stringify(metadata, null, 2)}\n`;
  if (outFile) {
    await writeFile(path.resolve(outFile), json);
    console.log(pc.green("✓ ") + `Wrote Metaplex metadata to ${pc.cyan(path.resolve(outFile))}`);
  } else {
    process.stdout.write(json);
  }
}

async function buildMetaplexMetadata(target: string): Promise<Record<string, unknown>> {
  const folder = await resolveBuddyFolder(target);
  const petJson = JSON.parse(await readFile(path.join(folder, "pet.json"), "utf8")) as Record<
    string,
    unknown
  >;
  const slug = path.basename(folder);
  const displayName = pickString(petJson.displayName, pickString(petJson.name, slug));
  const description = pickString(
    petJson.description,
    "An OpenClawd Blockchain Buddy for Solana-native AI agent workflows.",
  );
  const spriteFile = (await fileExists(path.join(folder, "spritesheet.webp")))
    ? "spritesheet.webp"
    : "spritesheet.png";
  const installedMetadataPath = path.join(folder, "openclawd-buddy.json");
  const installedMetadata = (await fileExists(installedMetadataPath))
    ? (JSON.parse(await readFile(installedMetadataPath, "utf8")) as Record<string, unknown>)
    : {};

  return {
    name: displayName,
    symbol: "BUDDY",
    description,
    external_url: `${SITE_URL}/pets/${slug}`,
    image: pickString(installedMetadata.spritesheetUrl, `./${spriteFile}`),
    properties: {
      category: "agent",
      platform: "OpenClawd",
      collection: "Blockchain Buddies",
      files: [
        {
          uri: pickString(installedMetadata.petJsonUrl, "./pet.json"),
          type: "application/json",
        },
        {
          uri: pickString(installedMetadata.spritesheetUrl, `./${spriteFile}`),
          type: spriteFile.endsWith(".png") ? "image/png" : "image/webp",
        },
      ],
      integrations: [
        "openclawd",
        "metaplex-agent-registry",
        "openai-codex",
        "petdex-cli",
      ],
      agent: {
        standard: "EIP-8004-compatible-agent-metadata",
        registry: "Metaplex Agent Registry",
        network: process.env.METAPLEX_AGENT_NETWORK ?? "solana-mainnet",
        capabilities: [
          "onchain-identity-ready",
          "delegation-ready",
          "codex-compatible-companion",
          "openclawd-buddy-package",
        ],
      },
    },
    attributes: [
      { trait_type: "Platform", value: "OpenClawd" },
      { trait_type: "Registry", value: "Metaplex Agent Registry" },
      { trait_type: "Codex Compatible", value: "true" },
      { trait_type: "Petdex Compatible", value: "true" },
    ],
  };
}

async function resolveBuddyFolder(target: string): Promise<string> {
  const direct = path.resolve(target);
  if (await fileExists(path.join(direct, "pet.json"))) return direct;
  const installed = path.join(BUDDIES_DIR, target);
  if (await fileExists(path.join(installed, "pet.json"))) return installed;
  throw new Error(`Could not find buddy package for ${target}`);
}

async function cmdPetdex(args: string[]) {
  const action = args[0];
  if (!action || action === "--help" || action === "-h") {
    console.log(
      [
        "",
        `  ${pc.bold("Petdex compatibility")}`,
        "",
        `    ${CLI_NAME} petdex list`,
        `    ${CLI_NAME} petdex install <slug>`,
        `    ${CLI_NAME} petdex submit <path>`,
        "",
        "  The published package also exposes a legacy `petdex` binary.",
        "  Set PETDEX_URL to point these commands at a Petdex-compatible API.",
        "",
      ].join("\n"),
    );
    return;
  }
  switch (action) {
    case "list":
      await cmdList();
      return;
    case "install":
      await cmdInstall(args.slice(1));
      return;
    case "submit":
      await cmdSubmit(args.slice(1));
      return;
    case "login":
      await cmdLogin();
      return;
    case "logout":
      await cmdLogout();
      return;
    case "whoami":
      await cmdWhoami();
      return;
    default:
      p.cancel(`Unknown petdex compatibility command: ${action}`);
      process.exit(1);
  }
}

async function cmdLogout() {
  await auth().logout();
  console.log(pc.green("✓ ") + "Signed out");
}

async function cmdWhoami() {
  try {
    const me = await auth().whoami();
    if (!me) throw new Error("not signed in");
    p.note(
      [
        `${pc.dim("user:    ")}${me.sub}`,
        `${pc.dim("email:   ")}${me.email ?? "—"}`,
        `${pc.dim("name:    ")}${[pickString(me.given_name, ""), pickString(me.family_name, "")].filter(Boolean).join(" ") || "—"}`,
        `${pc.dim("username:")}${pickString(me.preferred_username, "—")}`,
      ].join("\n"),
      "Signed in",
    );
  } catch {
    p.cancel(`Not signed in. Run ${pc.cyan(`${CLI_NAME} login`)}.`);
    process.exit(1);
  }
}

async function cmdInstall(args: string[]) {
  const slug = args[0];
  if (!slug) {
    p.cancel(`Usage: ${pc.cyan(`${CLI_NAME} install <slug>`)}`);
    process.exit(1);
  }

  // Cross-platform install implemented in Node. Earlier versions piped a
  // POSIX shell script through `sh`, which crashed on Windows where there is
  // no `sh` (#10 from kayotimoteo). Now we just resolve the asset URLs from
  // /api/manifest and write the files ourselves - same end result, works
  // identically on macOS, Linux, and Windows.
  const s = p.spinner();
  s.start(`Resolving ${slug}`);

  let pet: {
    slug: string;
    displayName: string;
    spritesheetUrl: string;
    petJsonUrl: string;
  };
  try {
    const manifestRes = await fetch(`${SITE_URL}/api/manifest`);
    if (!manifestRes.ok) {
      s.stop(pc.red("failed"));
      throw new Error(`manifest fetch ${manifestRes.status}`);
    }
    const data = (await manifestRes.json()) as {
      pets: Array<{
        slug: string;
        displayName: string;
        spritesheetUrl: string;
        petJsonUrl: string;
      }>;
    };
    const found = data.pets.find((p) => p.slug === slug);
    if (!found) {
      s.stop(pc.red("not found"));
      p.cancel(
        `No buddy with slug ${pc.bold(slug)}. Try ${pc.cyan(`${CLI_NAME} list`)} to see what's available.`,
      );
      process.exit(1);
    }
    pet = found;
  } catch (err) {
    s.stop(pc.red("failed"));
    throw err;
  }

  const petDir = path.join(BUDDIES_DIR, slug);
  s.message(`Downloading to ${petDir}`);

  await mkdir(petDir, { recursive: true });

  const ext = pet.spritesheetUrl.endsWith(".png") ? "png" : "webp";
  await Promise.all([
    download(pet.petJsonUrl, path.join(petDir, "pet.json")),
    download(pet.spritesheetUrl, path.join(petDir, `spritesheet.${ext}`)),
  ]);
  await writeInstallMetadata(petDir, pet);

  // Fire-and-forget install metric so the gallery counter ticks up.
  void fetch(`${SITE_URL}/install/${slug}`, { method: "GET" }).catch(
    () => {},
  );

  s.stop(`Installed ${pc.cyan(pet.displayName)}`);

  p.note(
    [
      `Path: ${pc.dim(petDir)}`,
      "",
      "OpenClawd can discover this buddy from:",
      `  ${pc.cyan(BUDDIES_DIR)}`,
      "",
      "Legacy Codex-compatible files are kept as pet.json and spritesheet.*.",
    ].join("\n"),
    "Next steps",
  );
}

async function writeInstallMetadata(
  petDir: string,
  pet: { slug: string; displayName: string; spritesheetUrl: string; petJsonUrl: string },
): Promise<void> {
  const metadata = {
    source: "blockchain-buddies",
    platform: "openclawd",
    siteUrl: SITE_URL,
    slug: pet.slug,
    displayName: pet.displayName,
    petJsonUrl: pet.petJsonUrl,
    spritesheetUrl: pet.spritesheetUrl,
    installedAt: new Date().toISOString(),
    format: "codex-pet-v1",
  };
  await writeFile(
    path.join(petDir, "openclawd-buddy.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download ${url} → ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

async function cmdList() {
  const s = p.spinner();
  s.start("Fetching buddy gallery");
  const res = await fetch(`${SITE_URL}/api/manifest`);
  if (!res.ok) {
    s.stop(pc.red("failed"));
    throw new Error(`failed to fetch manifest: ${res.status}`);
  }
  const data = (await res.json()) as {
    total: number;
    pets: Array<{
      slug: string;
      displayName: string;
      kind: string;
      submittedBy: string | null;
    }>;
  };
  s.stop(`${data.total} buddies`);

  const lines = data.pets.map((pet) => {
    const tag = pet.submittedBy ? pc.dim(` — by ${pet.submittedBy}`) : "";
    return `  ${pc.cyan(pet.slug.padEnd(26))} ${pet.displayName}${tag}`;
  });
  console.log(lines.join("\n"));
  console.log(
    `\n${pc.dim("Install with")} ${pc.cyan(`${CLI_NAME} install <slug>`)}\n${pc.dim("Browse:")} ${pc.underline(SITE_URL)}`,
  );
}

async function cmdSubmit(args: string[]) {
  const target = args[0];
  if (!target) {
    p.cancel(`Usage: ${pc.cyan(`${CLI_NAME} submit <path>`)}`);
    process.exit(1);
  }

  // Ensure auth before doing any work.
  let token: string;
  try {
    const t = await auth().getAccessToken();
    if (!t) {
      p.cancel(`Not signed in. Run ${pc.cyan(`${CLI_NAME} login`)}.`);
      process.exit(1);
    }
    token = t;
  } catch {
    p.cancel(`Not signed in. Run ${pc.cyan(`${CLI_NAME} login`)}.`);
    process.exit(1);
  }

  const absPath = path.resolve(target);
  const stats = await stat(absPath).catch(() => null);
  if (!stats) {
    p.cancel(`No such file or directory: ${target}`);
    process.exit(1);
  }

  p.intro(pc.bgMagenta(pc.white(` ${CLI_NAME} submit `)));
  const scan = p.spinner();
  scan.start(`Scanning ${absPath}`);
  const candidates = await collectCandidates(absPath, stats.isDirectory());
  scan.stop(
    candidates.length > 0
      ? `${candidates.length} ${candidates.length === 1 ? "buddy" : "buddies"} found`
      : pc.red("no buddies found"),
  );

  if (candidates.length === 0) {
    p.cancel(
      "A buddy folder must contain pet.json and spritesheet.{webp,png}.",
    );
    process.exit(1);
  }

  if (candidates.length > 1) {
    const proceed = await p.confirm({
      message: `Submit all ${pc.bold(String(candidates.length))} pets?`,
    });
    if (p.isCancel(proceed) || !proceed) {
      p.cancel("Aborted.");
      process.exit(1);
    }
  }

  let succeeded = 0;
  let failed = 0;
  const failures: Array<{ label: string; error: string }> = [];

  for (const cand of candidates) {
    const ps = p.spinner();
    ps.start(`Submitting ${pc.cyan(cand.label)}`);
    try {
      const t = await auth().getAccessToken();
      if (!t) throw new Error("session expired");
      token = t;
      const result = await submitOne(cand, token);
      ps.stop(`${pc.green("✓")} ${pc.cyan(cand.label)} → ${pc.dim(result.slug)}`);
      succeeded++;
    } catch (err) {
      const msg = (err as Error).message;
      ps.stop(`${pc.red("×")} ${pc.cyan(cand.label)} ${pc.red(msg.slice(0, 60))}`);
      failures.push({ label: cand.label, error: msg });
      failed++;
    }
  }

  if (failures.length > 0) {
    p.note(
      failures
        .map((f) => `${pc.red("•")} ${pc.bold(f.label)}: ${f.error}`)
        .join("\n"),
      "Failures",
    );
  }

  p.outro(
    `${pc.green(String(succeeded))} submitted, ${
      failed > 0 ? pc.red(String(failed)) : pc.dim(String(failed))
    } failed. Review at ${pc.underline(SITE_URL + "/admin")} (admin only).`,
  );
  if (failed > 0) process.exit(1);
}

// ─── candidate collection ──────────────────────────────────────────────────

type Candidate = {
  label: string;
  source: "folder" | "zip";
  petJson: string;
  petJsonObj: Record<string, unknown>;
  zipBuffer: Buffer;
  zipFileName: string;
  spritesheetBuffer: Buffer;
  spritesheetExt: "webp" | "png";
  petIdHint: string;
};

async function collectCandidates(
  target: string,
  isDir: boolean,
): Promise<Candidate[]> {
  if (!isDir) {
    if (!target.endsWith(".zip")) {
      throw new Error(`Expected a .zip file or a folder, got: ${target}`);
    }
    const cand = await readZipCandidate(target);
    return cand ? [cand] : [];
  }

  const targetHasPetJson = await fileExists(path.join(target, "pet.json"));
  if (targetHasPetJson) {
    const cand = await readFolderCandidate(target);
    return cand ? [cand] : [];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const out: Candidate[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = path.join(target, e.name);
    const cand = await readFolderCandidate(sub);
    if (cand) out.push(cand);
  }
  return out;
}

async function readFolderCandidate(folder: string): Promise<Candidate | null> {
  const petJsonPath = path.join(folder, "pet.json");
  if (!(await fileExists(petJsonPath))) return null;

  let spritePath = path.join(folder, "spritesheet.webp");
  let spritesheetExt: "webp" | "png" = "webp";
  if (!(await fileExists(spritePath))) {
    const pngPath = path.join(folder, "spritesheet.png");
    if (!(await fileExists(pngPath))) return null;
    spritePath = pngPath;
    spritesheetExt = "png";
  }

  const petJson = await readFile(petJsonPath, "utf8");
  let petJsonObj: Record<string, unknown> = {};
  try {
    petJsonObj = JSON.parse(petJson);
  } catch {
    throw new Error(`pet.json in ${folder} is not valid JSON`);
  }
  const spritesheetBuffer = await readFile(spritePath);

  const zip = new JSZip();
  zip.file("pet.json", petJson);
  zip.file(`spritesheet.${spritesheetExt}`, spritesheetBuffer);
  const zipBuffer = Buffer.from(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
  );

  const folderName = path.basename(folder);
  return {
    label: folderName,
    source: "folder",
    petJson,
    petJsonObj,
    zipBuffer,
    zipFileName: `${folderName}.zip`,
    spritesheetBuffer,
    spritesheetExt,
    petIdHint: typeof petJsonObj.id === "string" ? petJsonObj.id : folderName,
  };
}

async function readZipCandidate(zipPath: string): Promise<Candidate | null> {
  const buf = await readFile(zipPath);
  const zip = await JSZip.loadAsync(buf);
  const petJsonEntry = zip.file("pet.json");
  const webpEntry = zip.file("spritesheet.webp");
  const pngEntry = zip.file("spritesheet.png");
  const spriteEntry = webpEntry ?? pngEntry;
  const spritesheetExt: "webp" | "png" = webpEntry ? "webp" : "png";

  if (!petJsonEntry || !spriteEntry) {
    throw new Error(
      `Zip is missing pet.json or spritesheet.{webp,png}: ${zipPath}`,
    );
  }

  const petJson = await petJsonEntry.async("string");
  let petJsonObj: Record<string, unknown> = {};
  try {
    petJsonObj = JSON.parse(petJson);
  } catch {
    throw new Error(`pet.json in zip is not valid JSON`);
  }
  const spritesheetBuffer = Buffer.from(await spriteEntry.async("uint8array"));

  const baseName = path.basename(zipPath, ".zip");
  return {
    label: baseName,
    source: "zip",
    petJson,
    petJsonObj,
    zipBuffer: buf,
    zipFileName: path.basename(zipPath),
    spritesheetBuffer,
    spritesheetExt,
    petIdHint: typeof petJsonObj.id === "string" ? petJsonObj.id : baseName,
  };
}

// ─── upload pipeline ───────────────────────────────────────────────────────

async function submitOne(
  cand: Candidate,
  bearer: string,
): Promise<{ slug: string }> {
  const { width, height } = parseImageDims(cand.spritesheetBuffer);
  if (width === 0 || height === 0) {
    throw new Error("spritesheet dimensions could not be parsed");
  }

  const presignRes = await fetch(`${SITE_URL}/api/cli/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slugHint: slugify(cand.petIdHint),
      petId: cand.petIdHint,
      spritesheetExt: cand.spritesheetExt,
    }),
  });

  if (!presignRes.ok) {
    const text = await presignRes.text().catch(() => "");
    throw new Error(`presign ${presignRes.status} ${text.slice(0, 100)}`);
  }

  const presigned = (await presignRes.json()) as {
    files: Array<{
      role: "zip" | "sprite" | "petjson";
      uploadUrl: string;
      publicUrl: string;
    }>;
  };

  const slot = (role: "zip" | "sprite" | "petjson") => {
    const f = presigned.files.find((x) => x.role === role);
    if (!f) throw new Error(`presign response missing ${role}`);
    return f;
  };
  const zipSlot = slot("zip");
  const spriteSlot = slot("sprite");
  const petSlot = slot("petjson");

  const spriteMime = cand.spritesheetExt === "png" ? "image/png" : "image/webp";

  await Promise.all([
    putR2(zipSlot.uploadUrl, cand.zipBuffer, "application/zip"),
    putR2(spriteSlot.uploadUrl, cand.spritesheetBuffer, spriteMime),
    putR2(
      petSlot.uploadUrl,
      Buffer.from(cand.petJson, "utf8"),
      "application/json",
    ),
  ]);

  const reg = await fetch(`${SITE_URL}/api/cli/submit/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zipUrl: zipSlot.publicUrl,
      spritesheetUrl: spriteSlot.publicUrl,
      petJsonUrl: petSlot.publicUrl,
      petId: cand.petIdHint,
      displayName: pickString(cand.petJsonObj.displayName, "Untitled pet"),
      description: pickString(
        cand.petJsonObj.description,
        "An OpenClawd-compatible blockchain buddy.",
      ),
      spritesheetWidth: width,
      spritesheetHeight: height,
    }),
  });

  if (!reg.ok) {
    const text = await reg.text().catch(() => "");
    throw new Error(`register ${reg.status} ${text.slice(0, 100)}`);
  }

  const data = (await reg.json()) as { slug: string };
  return data;
}

async function putR2(
  url: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${res.status}`);
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function pickString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function userLabel(user: Record<string, unknown>): string {
  return (
    pickString(user.email, "") ||
    pickString(user.username, "") ||
    pickString(user.preferred_username, "") ||
    pickString(user.sub, "unknown")
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseImageDims(buf: Buffer): { width: number; height: number } {
  // PNG
  if (
    buf.length > 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // WebP
  if (
    buf.length > 30 &&
    buf.slice(0, 4).toString() === "RIFF" &&
    buf.slice(8, 12).toString() === "WEBP"
  ) {
    const fourcc = buf.slice(12, 16).toString();
    if (fourcc === "VP8X") {
      return {
        width: ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) >>> 0) + 1,
        height: ((buf[27] | (buf[28] << 8) | (buf[29] << 16)) >>> 0) + 1,
      };
    }
    if (fourcc === "VP8L") {
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      return {
        width: ((buf[21] | ((b1 & 0x3f) << 8)) >>> 0) + 1,
        height:
          ((((b1 >> 6) | (b2 << 2)) | ((b3 & 0x0f) << 10)) >>> 0) + 1,
      };
    }
    if (fourcc === "VP8 ") {
      for (let i = 23; i < Math.min(60, buf.length - 7); i++) {
        if (buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a) {
          return {
            width: (buf[i + 3] | (buf[i + 4] << 8)) & 0x3fff,
            height: (buf[i + 5] | (buf[i + 6] << 8)) & 0x3fff,
          };
        }
      }
    }
  }
  return { width: 0, height: 0 };
}
