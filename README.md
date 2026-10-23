# AI Wave Scorecard — MetaLearning AI

A 1:1 replica and full-featured platform of the **AI Wave Scorecard** self-assessment, rebuilt as a deployable Next.js web application with a scalable Postgres database backend.

- **Frontend:** The exact, responsive single-page scorecard interface (`src/index.template.html` → `public/index.html`), complete with all 26 custom illustrations (`public/art/`), SVG charts/quadrants/radars, and all 18 voice-narrated audio & trailer tracks (`public/audio/`).
- **Backend:** Next.js route handlers (`/api/responses` and `/api/health`), matching the API contract with honeypot bot defense, rate limiting, and constant-time owner authentication.
- **Database:** Serverless Postgres via `@neondatabase/serverless` (Neon / Vercel Postgres) with automatic schema migration. Local file-based fallback (`data/responses-local.json`) for zero-config offline development.
- **Deployment-Ready:** Hardened with Content Security Policy (allowing embedding/iframing on `aviperera.com`), HSTS, SEO meta tags, social share cards (Open Graph / Twitter), `robots.txt`, `sitemap.xml`, and branded 404 handler.

---

## Subdomain & Hosting Recommendation

- **Recommended Subdomain:** `aiwave.aviperera.com`
  - Perfectly represents the product ("AI Wave Scorecard: Where are you on the AI wave?").
  - Concise, memorable, and avoids confusing collisions with future scorecards or tools.
  - Detailed comparison & DNS evaluation: see [docs/SUBDOMAIN-DECISION.md](docs/SUBDOMAIN-DECISION.md).
- **Hostinger Deployment Guide:** Full step-by-step setup for Hostinger Node.js Web Apps (with automatic GitHub redeployments): see [docs/DEPLOY-HOSTINGER.md](docs/DEPLOY-HOSTINGER.md).

---

## Site Structure & Feature Matrix

| Tab / Route | Purpose |
|---|---|
| **Home** | "Maya's Wave" 4-minute animated SVG trailer (scrubbing, audio, subtitles/CC, variable playback speed), founding story, core mission, values, and 15-seat cohort model. |
| **The wave in numbers** | 8 verified AI trend sections with animated SVG data charts, expandable citations, and audio narrations. |
| **The four zones** | Detailed breakdown of Drowning, Wading in, Paddling, and Riding with strengths, common fears, and reframing advice. |
| **Examples** | 4 relatable archetypes demonstrating each zone in everyday real-world context. |
| **AI jargon** | Searchable plain-English glossary translating technical terms (RAG, Hallucination, LLMs, Agents, Context Windows). |
| **We've faced this before** | Historical perspective timeline with documented historical sources (The Wheel, Steam Power, Electricity, Clean Water, Space Race, Atomic Energy, Y2K). |
| **Your free analysis report** | Interactive multi-depth diagnostic (Quick Scan: 15 questions, Deep Scan: 40 questions, Full Diagnostic: 80 questions). Calculates real-time scores across 7 dimensions, visualizes quadrant & radar charts, pinpoints friction points, and delivers a customized 90-day learning roadmap. |
| **Responses (Hidden)** | Secure owner command center accessed via `/?owner` with password token. Displays submission counts, zone distributions, friction analytics, and full candidate scorecards. |

---

## API Endpoints

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/responses` | `POST` | Public | Submits completed scorecards. Includes bot honeypot validation and client IP rate-limiting. |
| `/api/responses` | `GET` | Admin (`Bearer <ADMIN_TOKEN>`) | Retrieves list of recorded scorecards. Protected by timing-safe string comparison and failed-attempt rate limits. |
| `/api/health` | `GET` | Public | Liveness probe verifying database connectivity and server latency for uptime monitors. |

---

## Quickstart & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```
   *(This also executes `postinstall` to generate `public/index.html` from `src/index.template.html`).*

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Generate a secure admin token:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
   Set `ADMIN_TOKEN` in `.env.local`. Leaving `DATABASE_URL` blank automatically uses local JSON storage in development.

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:3000/?owner` for owner view).

4. **Run End-to-End Test Suite:**
   ```bash
   npm run build
   npm start &
   npm run test:e2e
   ```

---

## Configuration

To customize cohort launch dates, seats, or community WhatsApp links:
Edit `const CONFIG` inside `src/index.template.html`:
```javascript
const CONFIG = {
  whatsappUrl: "https://chat.whatsapp.com/...",
  cohortDates: "November 2026",
  seats: "15"
};
```
Whenever `src/index.template.html` is edited, `npm run build` or `npm run prepare:site` regenerates `public/index.html` with your configured `NEXT_PUBLIC_SITE_URL`.
