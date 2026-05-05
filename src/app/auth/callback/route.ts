import { NextResponse } from "next/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddies.solanaclawd.com";

export function GET(req: Request) {
  const url = new URL(req.url);
  const hasCode = url.searchParams.has("code");
  const error = url.searchParams.get("error");
  const status = error ? "error" : hasCode ? "received" : "ready";

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>OpenClawd Buddies OAuth Callback</title>
  </head>
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 2rem; line-height: 1.5;">
    <main style="max-width: 42rem;">
      <h1>OAuth callback ${status}</h1>
      <p>This callback URL is registered for OpenClawd Buddies OAuth/OIDC flows.</p>
      <p><a href="${SITE_URL.replace(/"/g, "&quot;")}">Return to OpenClawd Buddies</a></p>
    </main>
  </body>
</html>`,
    {
      status: error ? 400 : 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
