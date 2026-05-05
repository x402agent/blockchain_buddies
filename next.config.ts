import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy. Blocks inline <script> sources we didn't ship,
// caps img / connect / frame ancestors. The `unsafe-inline` allowance for
// styles is required by Next/Tailwind during hydration; for scripts we
// keep 'unsafe-inline' as well because Next embeds RSC payloads inline,
// but with our same-origin CSRF guard + JSON-LD escape this is acceptable.
//
// Hosts allowed:
// - self for everything we render
// - Clerk custom domains + *.clerk.com / *.clerk.accounts.dev for
//   the Clerk client SDK
// - vercel-scripts / vitals for Vercel analytics
// - R2 public bucket + UploadThing host + Clerk image hosts + social
//   avatar hosts for sprites and avatars
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Clerk renders the sign-up CAPTCHA inside an iframe served from
  // challenges.cloudflare.com (Turnstile). Without it on frame-src and
  // its bootstrap script on script-src, the CAPTCHA fails to load and
  // the user can't create an account.
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.com https://*.clerk.accounts.dev https://accounts.buddies.openclawd.biz https://clerk.buddies.openclawd.biz https://accounts.petdex.crafter.run https://clerk.petdex.crafter.run",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.buddies.openclawd.biz https://clerk.buddies.openclawd.biz https://clerk.petdex.crafter.run https://accounts.petdex.crafter.run https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev https://yu2vz9gndp.ufs.sh https://img.clerk.com https://images.clerk.dev https://avatars.githubusercontent.com https://pbs.twimg.com https://storage.googleapis.com",
  "media-src 'self' https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev",
  "font-src 'self' data:",
  // R2 reads via pub-*.r2.dev, R2 PUT uploads via the account-specific
  // S3 endpoint (*.r2.cloudflarestorage.com). Both must be on the
  // connect-src allowlist or browser fetch / XHR fail with a generic
  // network error (root cause of issues #22-#80+).
  "connect-src 'self' https://accounts.buddies.openclawd.biz https://clerk.buddies.openclawd.biz https://clerk.petdex.crafter.run https://accounts.petdex.crafter.run https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://api.github.com https://challenges.cloudflare.com https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev https://*.r2.cloudflarestorage.com https://yu2vz9gndp.ufs.sh https://utfs.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // 2 years HSTS + subdomains. preload-ready when we want to submit to
  // hstspreload.org.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // Block clickjacking. Modern frame-ancestors lives in CSP but we keep
  // the legacy header for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop MIME sniffing — a pet.json that's secretly HTML won't be
  // executed as HTML by the browser.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Conservative referrer to avoid leaking pet detail URLs to ad nets.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful APIs. We don't use any of these.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  // CSP — see directives above.
  { key: "Content-Security-Policy", value: cspDirectives },
  // Cross-origin protections.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Hide the framework banner on every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
