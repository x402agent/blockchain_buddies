"use client";

import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

import { AnnouncementModal as VibeSearchModal } from "@/components/announcement-modal";
import { GithubStarModal } from "@/components/github-star-modal";
import { OnboardingTour } from "@/components/onboarding-tour";

type QueuedAnnouncement = {
  id: string;
  delayMs: number;
  gateMs: number;
  Component: ComponentType<{ onClose: () => void }>;
};

const HOME_PATH_RE = /^\/(?:en|es|zh)?\/?$/;

const QUEUE: QueuedAnnouncement[] = [
  {
    id: "petdex_tour_seen_v1",
    delayMs: 1200,
    gateMs: 600,
    Component: OnboardingTour,
  },
  {
    id: "petdex_announce_vibe_search_v1",
    delayMs: 0,
    gateMs: 600,
    Component: VibeSearchModal,
  },
  {
    id: "petdex_announce_github_star_v1",
    delayMs: 0,
    gateMs: 0,
    Component: GithubStarModal,
  },
];

type Phase = "idle" | "showing";

function isEligible(index: number, pathname: string | null) {
  if (index !== 0) return true;
  return HOME_PATH_RE.test(pathname ?? "/");
}

export function AnnouncementQueue() {
  const pathname = usePathname();
  const [index, setIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const activeItem = useMemo(
    () => (index === null ? null : QUEUE[index] ?? null),
    [index],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    for (let nextIndex = 0; nextIndex < QUEUE.length; nextIndex += 1) {
      if (!isEligible(nextIndex, pathname)) continue;
      if (window.localStorage.getItem(QUEUE[nextIndex].id) === "1") continue;
      setIndex(nextIndex);
      setPhase("idle");
      return;
    }

    setIndex(null);
    setPhase("idle");
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || activeItem === null || phase !== "idle")
      return;

    const timeout = window.setTimeout(() => {
      setPhase("showing");
    }, activeItem.delayMs);

    return () => window.clearTimeout(timeout);
  }, [activeItem, phase]);

  const handleClose = () => {
    if (typeof window === "undefined" || activeItem === null) return;

    window.localStorage.setItem(activeItem.id, "1");

    const nextIndex = (() => {
      for (let candidate = (index ?? -1) + 1; candidate < QUEUE.length; candidate += 1) {
        if (!isEligible(candidate, pathname)) continue;
        if (window.localStorage.getItem(QUEUE[candidate].id) === "1") continue;
        return candidate;
      }
      return null;
    })();

    window.setTimeout(() => {
      setIndex(nextIndex);
      setPhase("idle");
    }, activeItem.gateMs);
  };

  if (activeItem === null || phase !== "showing") {
    return null;
  }

  const Component = activeItem.Component;
  return <Component onClose={handleClose} />;
}
