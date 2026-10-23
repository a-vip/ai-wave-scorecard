// Liveness/readiness probe for uptime monitors. Reports whether storage is configured and reachable
// without exposing any configuration or data.
import { usingPostgres, storageConfigured, listResponses } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let db = "local-file";
  let ok = true;
  if (!storageConfigured()) {
    db = "not-configured";
    ok = false;
  } else if (usingPostgres()) {
    try {
      await listResponses(1);
      db = "up";
    } catch {
      db = "down";
      ok = false;
    }
  }
  return Response.json(
    { ok, db, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
