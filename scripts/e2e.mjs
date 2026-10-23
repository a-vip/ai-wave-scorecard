// End-to-end regression test. Drives the system Edge/Chrome via playwright-core (no browser download).
//   npm run build && npm start      (in another terminal)
//   npm run test:e2e                (BASE_URL defaults to http://localhost:3000)
// Safety: refuses to run against a non-local URL (it writes a test record) unless E2E_ALLOW_REMOTE=1.
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "fs";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE) && process.env.E2E_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to run against ${BASE} (writes a test record). Set E2E_ALLOW_REMOTE=1 to override.`);
  process.exit(2);
}

let TOKEN = process.env.ADMIN_TOKEN || "";
if (!TOKEN && existsSync(".env.local")) {
  const m = readFileSync(".env.local", "utf8").match(/^ADMIN_TOKEN=(.+)$/m);
  if (m) TOKEN = m[1].trim();
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") problems.push("console: " + m.text());
});
page.on("requestfailed", (r) => {
  if (!/\.mp3|fonts\.g/.test(r.url())) problems.push("requestfailed: " + r.url());
});
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`HTTP ${r.status()}: ${r.url()}`);
});

try {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#tab-home");
  check("home loads with title", (await page.title()) === "AI Wave Scorecard", await page.title());

  // every tab renders non-empty content
  for (const t of ["home", "trends", "zones", "examples", "jargon", "history", "quiz"]) {
    await page.click(`[data-tab="${t}"]`);
    await page.waitForTimeout(150);
    const len = await page.$eval(`#panel-${t}`, (el) => el.innerText.trim().length);
    check(`tab "${t}" renders`, len > 200, `${len} chars`);
  }

  // trailer poster -> play does not throw
  await page.click('[data-tab="home"]');
  await page.click("#tPoster");
  await page.waitForTimeout(1200);
  check("trailer starts (poster hidden)", await page.$eval("#tPoster", (el) => el.hidden || getComputedStyle(el).display === "none"));
  await page.click("#tPlayBtn").catch(() => {});

  // quick scan
  await page.click('[data-tab="quiz"]');
  await page.click('.ver[data-ver="quick"]');
  const pattern = [2, 4, 3, 5, 1, 4, 2, 3, 5, 4, 3, 2, 4, 5, 3];
  for (let i = 0; i < 15; i++) await page.click(`label[for="q${i}v${pattern[i]}"]`);
  check("progress shows 15 / 15", (await page.textContent("#progCount")).includes("15 / 15"));

  // missing-answer guard: clear nothing, but first verify submit works
  await page.click("#submitBtn");
  await page.waitForSelector("#quizResults:not([hidden])");
  const gate = await page.textContent("#quizResults");
  check("results show primary zone", /Primary:\s*(Drowning|Wading|Paddling|Riding)/i.test(gate));

  const email = `e2e+${Date.now()}@example.com`;
  await page.fill("#fname", "E2E Tester");
  await page.fill("#femail", email);
  await page.fill("#fcountry", "Vietnam");
  await page.check("#fconsent");
  await page.click("#unlockBtn");
  await page.waitForFunction(() => /on the waitlist/i.test(document.querySelector("#waitBox")?.innerText || ""), null, { timeout: 15000 });
  check("full results + saved to waitlist", true);
  const res = await page.textContent("#quizResults");
  for (const s of ["Where you land on the wave", "Zone probability", "Category radar", "Your learning route"])
    check(`results contain "${s}"`, res.includes(s));

  // owner dashboard shows the saved record
  if (!TOKEN) {
    check("owner dashboard (skipped: no ADMIN_TOKEN)", true);
  } else {
    // Direct API check with token
    const apiCheck = await ctx.request.get(BASE + "/api/responses", { headers: { authorization: `Bearer ${TOKEN}` } });
    check("owner API GET → 200", apiCheck.status() === 200, String(apiCheck.status()));
    const data = await apiCheck.json().catch(() => ({}));
    check("owner API lists E2E record", (data.records || []).some((r) => r.name === "E2E Tester"));

    // UI dashboard check
    const owner = await ctx.newPage();
    owner.on("pageerror", (e) => console.log("owner pageerror: " + e.message));
    await owner.goto(BASE + "/?owner", { waitUntil: "domcontentloaded" });
    await owner.waitForSelector("#tab-admin:not([hidden])");
    await owner.click("#tab-admin");
    await owner.waitForSelector("#adminKey");
    await owner.fill("#adminKey", TOKEN);
    await owner.click("#adminUnlock");
    await owner.waitForFunction(
      () => {
        const text = document.querySelector("#adminBody")?.textContent || "";
        return /Individual scorecards|Could not open|No saved scorecards|Access key rejected/i.test(text);
      },
      null,
      { timeout: 15000 }
    );
    const adminText = await owner.textContent("#adminBody");
    check("owner dashboard lists the new record", adminText.includes("E2E Tester"), adminText.slice(0, 80).replace(/\s+/g, " "));
    await owner.close();
  }

  // wrong key is rejected
  const bad = await ctx.request.get(BASE + "/api/responses", { headers: { authorization: "Bearer nope" } });
  check("wrong owner key → 401", bad.status() === 401, String(bad.status()));

  // headers + assets
  const home = await ctx.request.get(BASE + "/");
  const h = home.headers();
  for (const k of ["content-security-policy", "strict-transport-security", "x-content-type-options", "permissions-policy"])
    check(`header ${k}`, !!h[k]);
  check("no x-powered-by", !h["x-powered-by"]);
  const range = await ctx.request.get(BASE + "/audio/scene1.mp3", { headers: { range: "bytes=0-99" } });
  check("audio supports range requests (seeking)", range.status() === 206, String(range.status()));
  const health = await ctx.request.get(BASE + "/api/health");
  check("health endpoint ok", health.ok(), await health.text());

  check("no console errors / CSP violations / failed requests", problems.length === 0, problems.slice(0, 5).join(" | "));
} catch (e) {
  check("test run completed", false, e.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
