import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "@/i18n/config";

// Per-visitor stable shuffle seed used by the curated gallery sort
// (see lib/shuffle-seed.ts). Minted here rather than from the page
// because Next 16 forbids cookies().set() from Server Components.
const SHUFFLE_COOKIE = "petdex_shuffle_seed";
const SHUFFLE_PATTERN = /^[a-f0-9]{16}$/;
const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

function ensureShuffleSeed(req: Request, res: NextResponse): void {
  const existing = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SHUFFLE_COOKIE}=`))
    ?.split("=")[1];

  if (existing && SHUFFLE_PATTERN.test(existing)) return;

  const seed = randomBytes(8).toString("hex");
  res.cookies.set(SHUFFLE_COOKIE, seed, {
    maxAge: ONE_MONTH_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}

const isProtected = createRouteMatcher([
  "/submit",
  "/submit/(.*)",
  "/:locale/submit",
  "/:locale/submit/(.*)",
  "/api/submit",
  "/api/submit/(.*)",
  "/api/r2",
  "/api/r2/(.*)",
  "/admin",
  "/admin/(.*)",
  "/:locale/admin",
  "/:locale/admin/(.*)",
  "/api/admin",
  "/api/admin/(.*)",
  "/my-pets",
  "/my-pets/(.*)",
  "/:locale/my-pets",
  "/:locale/my-pets/(.*)",
  "/api/my-pets",
  "/api/my-pets/(.*)",
]);

const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }

  if (req.nextUrl.pathname.startsWith("/api")) {
    const res = NextResponse.next();
    ensureShuffleSeed(req, res);
    return res;
  }

  const res = handleI18nRouting(req);
  ensureShuffleSeed(req, res);
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals + static assets + SEO files (robots, sitemap)
    "/((?!_next|robots\\.txt|sitemap\\.xml|manifest\\.json|opengraph-image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
