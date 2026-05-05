"use client";

import { useState, useTransition } from "react";

import { useClerk } from "@clerk/nextjs";
import { track } from "@vercel/analytics";
import { Heart } from "lucide-react";

type LikeButtonProps = {
  slug: string;
  initialCount: number;
  initialLiked: boolean;
  signedIn: boolean;
};

export function LikeButton({
  slug,
  initialCount,
  initialLiked,
  signedIn,
}: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, start] = useTransition();
  const clerk = useClerk();

  function handleClick() {
    if (!signedIn) {
      clerk.openSignIn({});
      return;
    }
    if (pending) return;

    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    start(async () => {
      try {
        const res = await fetch(`/api/pets/${slug}/like`, { method: "POST" });
        if (!res.ok) throw new Error("like failed");
        const data = (await res.json()) as { liked: boolean; count: number };
        setLiked(data.liked);
        setCount(data.count);
        if (data.liked) {
          track("pet_liked", { slug });
        }
      } catch {
        // Revert
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      disabled={pending}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition disabled:opacity-60 ${
        liked
          ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-black/10 bg-surface text-muted-2 hover:border-rose-300 hover:text-rose-700"
      } dark:bg-rose-950/40 dark:text-rose-300 dark:hover:border-rose-700`}
    >
      <Heart
        className={`size-4 transition ${liked ? "fill-rose-500 text-rose-500" : ""}`}
      />
      <span className="font-mono text-xs tracking-[0.08em]">{count}</span>
    </button>
  );
}
