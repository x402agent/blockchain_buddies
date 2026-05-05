"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Heart, Sparkles, TerminalSquare, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  LeaderboardMetric,
  LeaderboardRow,
} from "@/lib/leaderboard";

type CreditMap = Record<
  string,
  {
    name: string;
    handle: string;
    username: string | null;
    githubUsername: string | null;
    imageUrl: string | null;
  }
>;

type Tab = {
  id: LeaderboardMetric;
  labelKey: string;
  icon: React.ReactNode;
  unitKey: string;
  blurbKey: string;
  emptyCopyKey: string;
};

const TABS: Tab[] = [
  {
    id: "pets",
    labelKey: "tabs.pets.label",
    icon: <Trophy className="size-3.5" />,
    unitKey: "tabs.pets.unit",
    blurbKey: "tabs.pets.blurb",
    emptyCopyKey: "tabs.pets.empty",
  },
  {
    id: "likes",
    labelKey: "tabs.likes.label",
    icon: <Heart className="size-3.5" />,
    unitKey: "tabs.likes.unit",
    blurbKey: "tabs.likes.blurb",
    emptyCopyKey: "tabs.likes.empty",
  },
  {
    id: "installs",
    labelKey: "tabs.installs.label",
    icon: <TerminalSquare className="size-3.5" />,
    unitKey: "tabs.installs.unit",
    blurbKey: "tabs.installs.blurb",
    emptyCopyKey: "tabs.installs.empty",
  },
  {
    id: "rising",
    labelKey: "tabs.rising.label",
    icon: <Sparkles className="size-3.5" />,
    unitKey: "tabs.rising.unit",
    blurbKey: "tabs.rising.blurb",
    emptyCopyKey: "tabs.rising.empty",
  },
];

type LeaderboardViewProps = {
  active: LeaderboardMetric;
  credits: CreditMap;
  rows: Record<LeaderboardMetric, LeaderboardRow[]>;
};

export function LeaderboardView({
  active,
  credits,
  rows,
}: LeaderboardViewProps) {
  const t = useTranslations("leaderboard");
  const router = useRouter();
  const params = useSearchParams();

  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];
  const data = rows[active];

  function selectTab(id: LeaderboardMetric) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (id === "pets") next.delete("tab");
    else next.set("tab", id);
    const qs = next.toString();
    router.replace(qs ? `/leaderboard?${qs}` : "/leaderboard", {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label={t("categoryAria")}
        className="flex flex-wrap items-center gap-1.5"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const count = rows[tab.id].length;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                isActive
                  ? "border-inverse bg-inverse text-on-inverse"
                  : "border-border-base bg-surface text-muted-2 hover:border-border-strong"
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
              <span
                className={`font-mono text-[10px] ${
                  isActive ? "text-on-inverse/60" : "text-muted-3"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-2">{t(activeTab.blurbKey)}</p>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-base bg-surface/60 p-10 text-center text-sm text-muted-2">
          {t(activeTab.emptyCopyKey)}
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {data.map((row, i) => (
            <LeaderboardRowItem
              key={row.ownerId}
              rank={i + 1}
              row={row}
              unit={t(activeTab.unitKey)}
              credit={credits[row.ownerId]}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function LeaderboardRowItem({
  rank,
  row,
  unit,
  credit,
}: {
  rank: number;
  row: LeaderboardRow;
  unit: string;
  credit: CreditMap[string] | undefined;
}) {
  const t = useTranslations("leaderboard");
  const name = credit?.name ?? "anonymous";
  const handle = credit?.handle ?? row.ownerId.slice(-8).toLowerCase();
  const avatar = credit?.imageUrl ?? null;
  // Prefer Clerk username, then GitHub username from the linked OAuth
  // account. If neither exists we hide the secondary line entirely
  // rather than showing the meaningless /u/<userid-tail> placeholder.
  const at = credit?.username ?? credit?.githubUsername ?? null;

  return (
    <li>
      <Link
        href={`/u/${handle}`}
        className="group flex items-center gap-4 rounded-2xl border border-border-base bg-surface/80 px-4 py-3 transition hover:border-border-strong"
      >
        <RankBadge rank={rank} />

        <div className="shrink-0">
          {avatar ? (
            // biome-ignore lint/performance/noImgElement: Clerk-hosted, lazy
            <img
              src={avatar}
              alt={name}
              className="size-10 rounded-full ring-1 ring-border-base"
            />
          ) : (
            <div className="grid size-10 place-items-center rounded-full bg-surface-muted font-mono text-sm text-muted-2 ring-1 ring-border-base">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {name}
          </span>
          {at ? (
            <span className="truncate font-mono text-[11px] text-muted-3">
              @{at}
            </span>
          ) : null}
        </div>

        <div className="hidden items-center gap-4 text-[11px] text-muted-3 sm:flex">
          <span>
            <span className="font-mono text-foreground">
              {row.approvedCount}
            </span>{" "}
            {t("secondaryStats.pets")}
          </span>
          <span>
            <span className="font-mono text-foreground">{row.totalLikes}</span>{" "}
            {t("secondaryStats.likes")}
          </span>
          <span>
            <span className="font-mono text-foreground">
              {row.totalInstalls}
            </span>{" "}
            {t("secondaryStats.installs")}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="font-mono text-lg font-semibold text-foreground">
            {row.value}
          </span>
          <span className="ml-1 text-[10px] tracking-[0.12em] text-muted-3 uppercase">
            {unit}
          </span>
        </div>
      </Link>
    </li>
  );
}

function RankBadge({ rank }: { rank: number }) {
  // Top 3 get gold/silver/bronze treatment, the rest get a neutral mono
  // ring so the eye still parses "this is a rank, not a count".
  if (rank === 1) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-chip-warning-bg font-mono text-sm font-semibold text-chip-warning-fg ring-1 ring-chip-warning-fg/30">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted font-mono text-sm font-semibold text-muted-1 ring-1 ring-border-strong">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-chip-danger-bg font-mono text-sm font-semibold text-chip-danger-fg ring-1 ring-chip-danger-fg/30">
        3
      </span>
    );
  }
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface font-mono text-xs font-medium text-muted-3 ring-1 ring-border-base">
      {rank}
    </span>
  );
}
