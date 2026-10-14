// /api/responses — same contract as the original host:
//   POST  (public)  JSON scorecard payload -> 200 {ok:true} | 4xx {error}
//   GET   (owner)   Authorization: Bearer <ADMIN_TOKEN> -> {records:[...]}
import { timingSafeEqual } from "crypto";
import { insertResponse, listResponses } from "@/lib/store";
import { validatePayload, ValidationError } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/* Best-effort per-instance rate limit: 12 submissions / 10 min / IP. */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 12;
}

function clientIp(req) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return json({ error: "Request too large" }, 413);
  if (rateLimited(clientIp(req))) return json({ error: "Too many submissions. Please try again later." }, 429);

  let body;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "Request too large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot: the client always sends website:"" — bots that fill it get a silent success.
  if (body && typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true });

  try {
    const rec = validatePayload(body);
    await insertResponse(rec, { userAgent: (req.headers.get("user-agent") || "").slice(0, 300) });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, 400);
    console.error("[api/responses] save failed:", e);
    return json({ error: "Saving failed" }, 500);
  }
}

function authorized(req) {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req) {
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);
  try {
    const records = await listResponses();
    return json({ records });
  } catch (e) {
    console.error("[api/responses] list failed:", e);
    return json({ error: "Could not load responses" }, 500);
  }
}
