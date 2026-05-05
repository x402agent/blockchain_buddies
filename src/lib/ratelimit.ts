import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const submitRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "24 h"),
  prefix: "petdex:submit",
  analytics: true,
});

// Withdrawals from /my-pets — generous so retries don't lock you out, but
// stops a malicious automated loop.
export const withdrawRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 m"),
  prefix: "petdex:withdraw",
});

// Claim attempts — anti-bruteforce for the cross-account flow even though
// the verified-email check already blocks the actual data move.
export const claimRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "petdex:claim",
});

// Public install-counter increments. Generous because a real user might
// install dozens of pets, but caps obvious automation. Keyed by IP.
export const installCounterRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "petdex:install-count",
});

// Zip-download tracker. Same shape as install-count.
export const trackZipRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "petdex:track-zip",
});

// Likes — generous so legit users browsing the gallery never hit the cap,
// but stops a 100-account brigade from inflating one pet to the top.
export const likeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "petdex:like",
});

// Pet requests + upvotes share a generous bucket — one user can shape the
// roadmap up to 30 actions / 10 min before we slow them down.
export const petRequestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "10 m"),
  prefix: "petdex:requests",
});

// R2 presign requests. Without this, a logged-in attacker can request
// thousands of presigned PUT URLs in a loop and waste R2 storage cost
// even if they never call /api/submit/register afterwards.
export const presignRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "petdex:presign",
});

// CLI bearer verification by IP — stops blind floods of bogus tokens
// burning Clerk userinfo quota.
export const cliVerifyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  prefix: "petdex:cli-verify",
});

// Owner edits to displayName/description/tags. Generous within the day so
// the owner can iterate copy, but caps a malicious loop that floods the
// admin queue with edit churn. Keyed by petId.
export const editRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "24 h"),
  prefix: "petdex:edit",
});

// User profile edits (bio, featured pet pin). Self-expression, no
// admin review, so we only need to stop spam loops. Keyed by userId.
export const profileEditRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "24 h"),
  prefix: "petdex:profile-edit",
});
