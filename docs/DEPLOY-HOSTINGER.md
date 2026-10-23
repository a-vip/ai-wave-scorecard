# Deploy to Hostinger (subdomain, from GitHub)

Hostinger runs Next.js apps via **Node.js web apps** with automatic builds on every push to GitHub.

> [!IMPORTANT]
> Node.js apps need a **Business** or **Cloud** (Startup/Professional/Enterprise) Hostinger plan. A basic Single/Premium shared plan cannot run this app. Check your plan in hPanel; you can upgrade from there. Supported Node versions: 18, 20, 22, 24 (use **22**).

## 1. Create the database (5 min, free)

Hostinger's file system is replaced on every deploy, so responses must live in an external database. The app uses Postgres.

1. Sign up at [neon.tech](https://neon.tech) and create a project (pick a region near your visitors).
2. Copy the **connection string** (starts with `postgresql://`).
3. That is your `DATABASE_URL`. The table is created automatically on first use.

## 2. Create the subdomain

In hPanel, add the subdomain **`aiwave.aviperera.com`** (see [SUBDOMAIN-DECISION.md](SUBDOMAIN-DECISION.md)). If your domain's DNS is managed by Hostinger, the record is added for you. If DNS is elsewhere, add the record Hostinger shows you.

## 3. Deploy the app

1. hPanel → **Websites → Add website → Node.js Apps** and choose **GitHub**.
2. Authorize GitHub and select this repository, branch `main`.
3. Framework: **Next.js** (auto-detected). Node version: **22**.
4. Attach it to the subdomain `aiwave.aviperera.com`.
5. Add these **environment variables**:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string |
| `ADMIN_TOKEN` | a long random string (see below) |
| `NEXT_PUBLIC_SITE_URL` | `https://aiwave.aviperera.com` |

Generate the token on your computer:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

6. Deploy. Wait for the build to finish.

> [!WARNING]
> Do **not** set `ALLOW_LOCAL_STORE` on the host. It exists only for CI/local testing; the host's file system is wiped on each deploy.

## 4. Check it works

1. Open `https://aiwave.aviperera.com/api/health`. Expect `{"ok":true,"db":"up",...}`.
   - `"db":"not-configured"` means `DATABASE_URL` is missing.
   - `"db":"down"` means the connection string is wrong or the database is paused.
2. Take the Quick Scan on the live site, fill the waitlist form, and tick consent.
3. Open `https://aiwave.aviperera.com/?owner`, go to the **Responses** tab, and enter your `ADMIN_TOKEN`. Your test entry should be listed.

## 5. Updating later

- Push to `main` and Hostinger rebuilds and redeploys automatically. Pull requests get temporary previews.
- Page text/logic lives in `src/index.template.html` (the file `public/index.html` is generated from it, don't edit that one).
- Images go in `public/art/`, audio in `public/audio/`.
- Contact/WhatsApp/cohort dates: edit `const CONFIG = {...}` in `src/index.template.html`.
- Run locally: `npm install`, copy `.env.example` to `.env.local`, then `npm run dev`.
- Regression test before you push: `npm run build`, start the server, then `npm run test:e2e`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails with an out-of-memory error | Plan limits; retry, or upgrade the plan. The config already limits the build to one worker. |
| Page loads but saving fails | Check `/api/health` (see step 4). |
| Owner tab says "Access key rejected" | Wrong `ADMIN_TOKEN`; after 8 wrong tries you are blocked for 15 minutes. |
| Social share shows no image | `NEXT_PUBLIC_SITE_URL` was not set at build time. Set it and redeploy. |
