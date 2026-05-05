// Server-only Drizzle client. Importing this from a client component
// will throw a build-time error (via the `server-only` package) which
// is far easier to debug than a runtime "DATABASE_URL is not set" in
// the browser console.
import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const sql = neon(
  process.env.DATABASE_URL ??
    "postgres://missing:missing@localhost:5432/missing",
);

export const db = drizzle(sql, { schema });
export { schema };
