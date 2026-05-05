"use client";

import { useMemo, useState } from "react";

import { Loader2, Play, Sparkles, Terminal } from "lucide-react";

type BuddyOption = {
  slug: string;
  displayName: string;
  kind?: string;
};

type CommandSnapshot = {
  exitCode: number;
  stdout: string;
  stderr: string;
  error: string | null;
};

type CodexResponse =
  | {
      ok: true;
      sandboxId: string;
      buddy: {
        slug: string;
        displayName: string;
        kind: string | null;
        spritesheetUrl: string;
        petJsonUrl: string;
      };
      paths: {
        openclawdDir: string;
        codexDir: string;
      };
      setup: CommandSnapshot;
      codex: CommandSnapshot | null;
    }
  | {
      ok: false;
      error: string;
      message?: string;
    };

type E2BCodexTerminalProps = {
  buddies: BuddyOption[];
};

export function E2BCodexTerminal({ buddies }: E2BCodexTerminalProps) {
  const defaultSlug = buddies[0]?.slug ?? "";
  const [slug, setSlug] = useState(defaultSlug);
  const [customSlug, setCustomSlug] = useState("");
  const [petdexUrl, setPetdexUrl] = useState("");
  const [prompt, setPrompt] = useState(
    "Load this buddy as my OpenClawd Codex terminal companion and describe what files were injected.",
  );
  const [running, setRunning] = useState<"inject" | "codex" | null>(null);
  const [result, setResult] = useState<CodexResponse | null>(null);

  const selectedSlug = customSlug.trim() || slug;
  const canRun = selectedSlug.length > 0 && running === null;

  const transcript = useMemo(() => {
    if (!result) {
      return [
        "$ openclawd buddies e2b --pet <slug>",
        "Waiting for a buddy injection request...",
      ].join("\n");
    }
    if (!result.ok) {
      return [
        "$ openclawd buddies e2b",
        `error: ${result.error}`,
        result.message ?? "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    const lines = [
      `$ e2b sbx create codex # ${result.sandboxId}`,
      `$ openclawd buddies inject ${result.buddy.slug}`,
      `buddy: ${result.buddy.displayName}`,
      `openclawd: ${result.paths.openclawdDir}`,
      `codex: ${result.paths.codexDir}`,
      "",
      result.setup.stdout.trim(),
    ];

    if (result.setup.stderr.trim()) {
      lines.push("", "stderr:", result.setup.stderr.trim());
    }

    if (result.codex) {
      lines.push("", "$ codex exec --full-auto --skip-git-repo-check ...");
      if (result.codex.stdout.trim()) lines.push(result.codex.stdout.trim());
      if (result.codex.stderr.trim()) {
        lines.push("", "codex stderr:", result.codex.stderr.trim());
      }
    }

    return lines.filter(Boolean).join("\n");
  }, [result]);

  async function run(mode: "inject" | "codex") {
    if (!canRun) return;
    setRunning(mode);
    setResult(null);

    try {
      const res = await fetch("/api/e2b/codex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedSlug,
          petdexUrl: petdexUrl.trim() || undefined,
          prompt,
          runCodex: mode === "codex",
        }),
      });
      const payload = (await res.json()) as CodexResponse;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error: "request_failed",
        message:
          error instanceof Error
            ? error.message
            : "The E2B request could not be completed.",
      });
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-10 md:px-8">
      <div className="grid gap-5 rounded-2xl border border-border-base bg-surface p-4 shadow-sm md:grid-cols-[360px_1fr] md:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-brand uppercase">
              <Terminal className="size-4" />
              E2B Codex injection
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Put a buddy inside the terminal
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-1">
              Create a secure Codex sandbox, copy a Blockchain Buddy into
              OpenClawd and Codex pet folders, then run Codex against that
              terminal context.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Featured buddy
            <select
              className="h-11 rounded-lg border border-border-base bg-background px-3 text-sm outline-none transition focus:border-brand"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={buddies.length === 0}
            >
              {buddies.length === 0 ? (
                <option value="">No featured buddies loaded</option>
              ) : (
                buddies.map((buddy) => (
                  <option key={buddy.slug} value={buddy.slug}>
                    {buddy.displayName} / {buddy.slug}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Any Petdex slug
            <input
              className="h-11 rounded-lg border border-border-base bg-background px-3 font-mono text-sm outline-none transition focus:border-brand"
              placeholder="optional-slug"
              value={customSlug}
              onChange={(event) => setCustomSlug(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            External Petdex URL
            <input
              className="h-11 rounded-lg border border-border-base bg-background px-3 font-mono text-sm outline-none transition focus:border-brand"
              placeholder="https://example.com"
              value={petdexUrl}
              onChange={(event) => setPetdexUrl(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Codex prompt
            <textarea
              className="min-h-28 resize-y rounded-lg border border-border-base bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-brand"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => run("inject")}
              disabled={!canRun}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border-base bg-background px-3 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running === "inject" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Inject
            </button>
            <button
              type="button"
              onClick={() => run("codex")}
              disabled={!canRun}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-inverse px-3 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running === "codex" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run Codex
            </button>
          </div>
        </div>

        <div className="min-h-[520px] overflow-hidden rounded-xl border border-black/20 bg-[#08110d] text-[#b9f7d1] shadow-inner">
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.03] px-3">
            <span className="font-mono text-[11px] tracking-[0.16em] text-[#7fe2a5] uppercase">
              openclawd-e2b-codex
            </span>
            <span className="font-mono text-[11px] text-[#6fae85]">
              server keys only
            </span>
          </div>
          <pre className="h-[480px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6">
            {running
              ? `$ openclawd buddies e2b --pet ${selectedSlug}\ncreating secure E2B Codex sandbox...\n`
              : transcript}
          </pre>
        </div>
      </div>
    </section>
  );
}
