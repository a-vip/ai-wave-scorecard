// Generates public/index.html from src/index.template.html.
// Substitutes %%SITE_URL%% with NEXT_PUBLIC_SITE_URL (e.g. https://scorecard.aviperera.com).
// When no site URL is configured, tags that need an absolute URL (canonical / og:url / og:image) are dropped
// rather than emitted broken. Runs automatically before `dev` and `build`.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim().replace(/\/+$/, "");
if (raw && !/^https?:\/\/[^\s/]+$/.test(raw)) {
  console.error(`Invalid NEXT_PUBLIC_SITE_URL "${raw}". Use an origin like https://scorecard.aviperera.com`);
  process.exit(1);
}

let html = readFileSync("src/index.template.html", "utf8");
if (raw) {
  html = html.replaceAll("%%SITE_URL%%", raw);
} else {
  // Drop every tag carrying the token (each is a single self-contained tag).
  html = html.replace(/<(?:link|meta)\b[^>]*%%SITE_URL%%[^>]*>/g, "");
}
if (html.includes("%%SITE_URL%%")) throw new Error("Unreplaced %%SITE_URL%% token remains");

mkdirSync(dirname("public/index.html"), { recursive: true });
writeFileSync("public/index.html", html);
console.log(`prepare: public/index.html written (${(html.length / 1024).toFixed(0)} KB, site url: ${raw || "none"})`);
