// Storage layer for scorecard responses.
// - Production: Postgres (Neon / Vercel-Neon integration) via DATABASE_URL or POSTGRES_URL.
// - Local dev without a DB: falls back to data/responses-local.json so the full flow works offline.
import { promises as fs } from "fs";
import path from "path";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const LOCAL_FILE = path.join(process.cwd(), "data", "responses-local.json");

export const usingPostgres = () => Boolean(DB_URL);

// The JSON-file fallback is for local development only. In production the filesystem is ephemeral
// (e.g. Hostinger creates a fresh build folder on every deploy), so saving there would silently lose data.
export const storageConfigured = () =>
  usingPostgres() || process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_STORE === "1";
function assertStorage() {
  if (!storageConfigured()) throw new Error("DATABASE_URL is not configured");
}

let sqlPromise = null;
let schemaReady = null;

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = import("@neondatabase/serverless").then(({ neon }) => neon(DB_URL));
  }
  return sqlPromise;
}

import { SCHEMA_SQL } from "./schema.mjs";

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = await getSql();
      for (const stmt of SCHEMA_SQL) await sql.query(stmt);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/* ---------- local JSON fallback ---------- */
async function readLocal() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeLocal(rows) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2));
}

/* ---------- public API ---------- */
export async function insertResponse(rec, meta = {}) {
  assertStorage();
  if (usingPostgres()) {
    await ensureSchema();
    const sql = await getSql();
    await sql.query(
      `INSERT INTO responses
         (ts, version, zone, zone2, level, tier, x, y, readiness, pct, friction, answers, notes,
          name, email, country, phone, interest, consent, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (email, ts, version) DO NOTHING`,
      [
        rec.ts, rec.version, rec.zone, rec.zone2, rec.level, rec.tier, rec.x, rec.y, rec.readiness,
        JSON.stringify(rec.pct), JSON.stringify(rec.friction), JSON.stringify(rec.answers), JSON.stringify(rec.notes),
        rec.name, rec.email, rec.country, rec.phone, rec.interest, rec.consent, meta.userAgent || null,
      ]
    );
    return;
  }
  const rows = await readLocal();
  if (rows.some((r) => r.email === rec.email && r.ts === rec.ts && r.version === rec.version)) return;
  rows.push({ id: rows.length + 1, created_at: new Date().toISOString(), ...rec, user_agent: meta.userAgent || null });
  await writeLocal(rows);
}

export async function listResponses(limit = 2000) {
  assertStorage();
  if (usingPostgres()) {
    await ensureSchema();
    const sql = await getSql();
    const rows = await sql.query(
      `SELECT id, created_at, ts, version, zone, zone2, level, tier, x, y, readiness, pct, friction,
              answers, notes, name, email, country, phone, interest, consent
         FROM responses ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  }
  const rows = await readLocal();
  return rows.slice().reverse().slice(0, limit);
}
