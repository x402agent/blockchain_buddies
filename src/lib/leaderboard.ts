// Creator leaderboard queries.
//
// All metrics exclude `source = 'discover'` rows so admin-imported pets
// (where ownerId points at the importer, not the artist) don't poison
// the ranking. They re-enter once the original author claims them.
// Admins themselves are also filtered out — the leaderboard exists to
// surface community creators, not the team running the catalog.

import { sql } from "drizzle-orm";

import { getAdminUserIds } from "@/lib/admin";
import { db } from "@/lib/db/client";

export type LeaderboardMetric = "pets" | "likes" | "installs" | "rising";

export type LeaderboardRow = {
  ownerId: string;
  // The metric value the row was ranked by — number of pets, likes, installs,
  // or recent approvals. Same name regardless of variant so the renderer
  // can be metric-agnostic.
  value: number;
  // Secondary stats kept in every variant for context, in case we want to
  // show "21 pets · 624 installs · 11 likes" on every row.
  approvedCount: number;
  totalLikes: number;
  totalInstalls: number;
  totalDownloads: number;
};

const TOP_LIMIT = 50;

// Defensive: this guarantees the leaderboard never lists somebody at #1
// with `0`. We don't want a "no signal yet" scoreboard on top of nothing.
const MIN_VALUE = 1;

export async function getLeaderboard(
  metric: LeaderboardMetric,
): Promise<LeaderboardRow[]> {
  const result = (await db.execute(
    metric === "rising" ? risingQuery() : aggregateQuery(metric),
  )) as unknown as {
    rows: Array<{
      owner_id: string;
      value: string | number;
      approved_count: string | number;
      total_likes: string | number;
      total_installs: string | number;
      total_downloads: string | number;
    }>;
  };

  const adminIds = getAdminUserIds();
  return result.rows
    .map((row) => ({
      ownerId: row.owner_id,
      value: Number(row.value),
      approvedCount: Number(row.approved_count),
      totalLikes: Number(row.total_likes),
      totalInstalls: Number(row.total_installs),
      totalDownloads: Number(row.total_downloads),
    }))
    .filter((r) => r.value >= MIN_VALUE && !adminIds.has(r.ownerId));
}

function aggregateQuery(metric: Exclude<LeaderboardMetric, "rising">) {
  // value is the column we ORDER BY. tie-breakers always cascade through
  // approved_count -> total_likes so two creators with the same headline
  // metric still get a deterministic order.
  const valueExpr = (() => {
    switch (metric) {
      case "pets":
        return sql`COUNT(*) FILTER (WHERE sp.status='approved')`;
      case "likes":
        return sql`COALESCE(SUM(pm.like_count), 0)`;
      case "installs":
        return sql`COALESCE(SUM(pm.install_count), 0)`;
    }
  })();

  return sql`
    SELECT
      sp.owner_id                                                    AS owner_id,
      ${valueExpr}::bigint                                            AS value,
      COUNT(*) FILTER (WHERE sp.status='approved')::bigint            AS approved_count,
      COALESCE(SUM(pm.like_count), 0)::bigint                         AS total_likes,
      COALESCE(SUM(pm.install_count), 0)::bigint                      AS total_installs,
      COALESCE(SUM(pm.zip_download_count), 0)::bigint                 AS total_downloads
    FROM submitted_pets sp
    LEFT JOIN pet_metrics pm ON pm.pet_slug = sp.slug
    WHERE sp.source <> 'discover'
    GROUP BY sp.owner_id
    HAVING ${valueExpr} > 0
    ORDER BY value DESC, approved_count DESC, total_likes DESC
    LIMIT ${TOP_LIMIT}
  `;
}

function risingQuery() {
  // "Rising" = approved pets in the last 7 days. Metric is recent count;
  // we still surface lifetime stats so a brand-new creator with 1 pet
  // doesn't outrank a returning vet with 3 in the same week unless they
  // genuinely shipped more this week.
  return sql`
    SELECT
      sp.owner_id                                                                            AS owner_id,
      COUNT(*) FILTER (
        WHERE sp.status='approved' AND sp.approved_at > now() - interval '7 days'
      )::bigint                                                                              AS value,
      COUNT(*) FILTER (WHERE sp.status='approved')::bigint                                   AS approved_count,
      COALESCE(SUM(pm.like_count), 0)::bigint                                                AS total_likes,
      COALESCE(SUM(pm.install_count), 0)::bigint                                             AS total_installs,
      COALESCE(SUM(pm.zip_download_count), 0)::bigint                                        AS total_downloads
    FROM submitted_pets sp
    LEFT JOIN pet_metrics pm ON pm.pet_slug = sp.slug
    WHERE sp.source <> 'discover'
    GROUP BY sp.owner_id
    HAVING COUNT(*) FILTER (
      WHERE sp.status='approved' AND sp.approved_at > now() - interval '7 days'
    ) > 0
    ORDER BY value DESC, approved_count DESC, total_likes DESC
    LIMIT ${TOP_LIMIT}
  `;
}

// Single-owner rank lookup for the inline badge on /u/[handle].
// Returns null when the owner is outside the top, so callers can skip
// rendering rather than displaying "#999".
export async function getOwnerRank(
  ownerId: string,
  metric: LeaderboardMetric = "pets",
): Promise<{ rank: number; total: number; value: number } | null> {
  const rows = await getLeaderboard(metric);
  const idx = rows.findIndex((r) => r.ownerId === ownerId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: rows.length, value: rows[idx].value };
}
