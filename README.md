# AI Wave Scorecard — MetaLearning AI

A 1:1 replica of the **AI Wave Scorecard** site, rebuilt as a deployable platform with a real database backend.

- **Frontend:** the original single-page app, byte-for-byte (`public/index.html`), with all 26 illustrations (`public/art/`) and all 18 narration/trailer tracks (`public/audio/`).
- **Backend:** Next.js route handler at `/api/responses`, using the same contract as the original host.
- **Database:** Postgres (Neon / Vercel). Falls back to a local JSON file when no DB is configured.

## What the site does

| Tab | Purpose |
|---|---|
| Home | "Maya's Wave" 4-minute animated trailer (with scrubbing, CC, speed), story, mission, values, cohort pitch |
| The wave in numbers | 8 sourced trend sections with animated SVG charts and narrated audio |
| The four zones | Drowning / Wading in / Paddling / Riding, with traits and stats |
| Examples | Four made-up personas, one per zone |
| AI jargon | Searchable plain-language glossary |
| We've faced this before | Historical timeline (wheel → Y2K), every claim sourced |
| Your free analysis report | 3 depths (Quick 15 Q / Deep 40 Q / Full 80 Q), scored in-browser on 7 categories → quadrant, radar, zone probability, level ladder, friction points, 90-day route, waitlist offers |
| Responses (hidden) | Owner dashboard. Open the site with `?owner` and enter `ADMIN_TOKEN` |

Quiz drafts persist in `localStorage` (`aiwave-draft-v1`). Scorecards are only sent to the server once the user gives contact details **and** ticks consent.

## API

| Method | Auth | Body / Response |
|---|---|---|
| `POST /api/responses` | none (honeypot + rate limit) | scorecard JSON → `{ ok: true }` or `{ error }` |
| `GET /api/responses` | `Authorization: Bearer $ADMIN_TOKEN` | `{ records: [...] }` newest first |

## Run locally

```bash
npm install
cp .env.example .env.local   # set ADMIN_TOKEN; leave DATABASE_URL empty to use data/responses-local.json
npm run dev                  # http://localhost:3000   (owner view: http://localhost:3000/?owner)
```

## Deploy (GitHub → Vercel + Neon)

1. Push this folder to a new GitHub repo.
2. Import the repo in Vercel.
3. Storage → add **Neon Postgres**. This sets `DATABASE_URL` automatically.
4. Add the env var `ADMIN_TOKEN`.
5. Deploy. The table is created automatically on first request (or run `npm run db:init`).

## Configuration inside the frontend

`public/index.html` → `const CONFIG = { whatsappUrl: "", cohortDates: "", seats: "15" }` controls the WhatsApp link and cohort dates on the results page.
