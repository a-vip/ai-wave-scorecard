// One-off schema setup: `npm run db:init` (requires DATABASE_URL or POSTGRES_URL).
// The API also creates the schema lazily on first request, so this is optional.
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL (or POSTGRES_URL) first.");
  process.exit(1);
}
const { SCHEMA_SQL } = await import("../lib/schema.mjs");
const sql = neon(url);
for (const stmt of SCHEMA_SQL) await sql.query(stmt);
console.log("Schema ready.");
