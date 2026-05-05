import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export const hasRuntimeDatabaseUrl = Boolean(process.env.DATABASE_URL);

const sql = neon(
  process.env.DATABASE_URL ??
    "postgres://missing:missing@localhost:5432/missing",
);

export const runtimeDb = drizzle(sql, { schema });
export { schema };
