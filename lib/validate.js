// Server-side validation for /api/responses payloads.
// Mirrors the client-side rules in public/index.html (unlock() and saveResults()) so the DB
// only ever holds well-formed, consented records.

export const VERSIONS = ["quick", "deep", "full"];
export const ZORDER = ["drowning", "wading", "paddling", "riding"];
export const CORDER = ["mindset", "usage", "skill", "systems", "clarity", "vision", "readiness"];
export const TIERS = ["Foundational", "Intermediate", "Expert"];
const MAX_Q = { quick: 15, deep: 40, full: 80 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,24}$/;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

export class ValidationError extends Error {}

export function validatePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ValidationError("Invalid request");

  const version = VERSIONS.includes(body.version) ? body.version : null;
  if (!version) throw new ValidationError("Unknown scorecard version");
  const nQ = MAX_Q[version];

  const zone = ZORDER.includes(body.zone) ? body.zone : null;
  if (!zone) throw new ValidationError("Unknown zone");
  const zone2 = ZORDER.includes(body.zone2) ? body.zone2 : null;

  const level = int(body.level, 1, 5);
  if (level == null) throw new ValidationError("Invalid level");

  const ts = int(body.ts, 1_600_000_000_000, Date.now() + 86_400_000);
  if (ts == null) throw new ValidationError("Invalid timestamp");

  const name = str(body.name, 60);
  const email = str(body.email, 120).toLowerCase();
  const country = str(body.country, 60);
  const phone = str(body.phone, 24);
  const interest = str(body.interest, 500);
  if (!name) throw new ValidationError("Name is required");
  if (!EMAIL_RE.test(email)) throw new ValidationError("A valid email is required");
  if (!country) throw new ValidationError("Country is required");
  if (phone && !PHONE_RE.test(phone)) throw new ValidationError("Invalid phone number");
  if (body.consent !== true) throw new ValidationError("Consent is required");

  const pct = {};
  if (body.pct && typeof body.pct === "object") {
    for (const c of CORDER) {
      const v = int(body.pct[c], 0, 100);
      if (v != null) pct[c] = v;
    }
  }

  const answers = {};
  if (body.answers && typeof body.answers === "object") {
    for (let i = 1; i <= nQ; i++) {
      const v = int(body.answers[String(i)], 1, 5);
      if (v != null) answers[String(i)] = v;
    }
  }
  if (Object.keys(answers).length !== nQ) throw new ValidationError("Incomplete answers");

  const notes = {};
  if (body.notes && typeof body.notes === "object") {
    for (let i = 1; i <= nQ; i++) {
      const t = str(body.notes[String(i)], 500);
      if (t) notes[String(i)] = t;
    }
  }

  const friction = Array.isArray(body.friction)
    ? body.friction.map((n) => int(n, 1, nQ)).filter((n) => n != null).slice(0, 5)
    : [];

  return {
    ts,
    version,
    zone,
    zone2,
    level,
    tier: TIERS.includes(body.tier) ? body.tier : null,
    x: int(Math.round(Number(body.x)), 0, 100),
    y: int(Math.round(Number(body.y)), 0, 100),
    readiness: body.readiness == null ? null : int(Math.round(Number(body.readiness)), 0, 100),
    pct,
    friction,
    answers,
    notes,
    name,
    email,
    country,
    phone,
    interest,
    consent: true,
  };
}
