# Embedding AI Wave Scorecard on aviperera.com

This guide explains how to host the AI Wave Scorecard on **aviperera.com/ai-wave** so visitors stay on your main website domain without paying for a Hostinger plan upgrade.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │    Your Website (WordPress / Hostinger)      │
                      │         https://aviperera.com/ai-wave        │
                      └──────────────────────┬───────────────────────┘
                                             │
                      Seamless Iframe Embed  │ (Auto-resized via postMessage,
                      with Parent Theme      │  Passes ?owner query params)
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          Cloud Backend & Static App          │
                      │          (Vercel Hobby Tier — Free)          │
                      │     https://ai-wave-scorecard.vercel.app     │
                      └──────────────────────┬───────────────────────┘
                                             │
                         Serverless Queries  │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │           Neon Serverless Postgres           │
                      │                (Free Tier)                   │
                      │         Tables: responses, schema            │
                      └──────────────────────────────────────────────┘
```

- **Visitor Experience:** Visitors browse `https://aviperera.com/ai-wave` with your website's header, footer, and styling.
- **Performance:** Heavy operations (audio streaming of 18 tracks, WebP image serving, scoring engine, Postgres transactions) run on Vercel's global edge CDN, keeping your Hostinger shared hosting server fast and light.
- **Admin Access:** Visiting `https://aviperera.com/ai-wave?owner` automatically unlocks the private Owner responses tab inside the embed.

---

## Method 1: WordPress Page Template (Recommended)

A custom page template (`page-ai-wave.php`) has been created directly in your active theme folder:
`c:\AI_Workspace\Obsidian\Avi\avi-wp-theme\page-ai-wave.php`

### Steps in WordPress Admin:
1. Open your WordPress Admin (`aviperera.com/wp-admin`).
2. Go to **Pages > Add New**.
3. **Title:** `AI Wave Scorecard`
4. **Permalink / Slug:** Ensure the slug is set to `ai-wave` (URL: `https://aviperera.com/ai-wave`).
5. On the right-hand sidebar under **Page Attributes** / **Template**, select:
   **AI Wave Scorecard**.
6. **(Optional Custom Field):** If your deployed Vercel URL differs from the default `https://ai-wave-scorecard.vercel.app`, add a Custom Field named `ai_wave_app_url` with your Vercel URL.
7. Click **Publish**.

---

## Method 2: Copy-Paste HTML Block (Gutenberg / Elementor)

If you ever want to embed the scorecard on any other page or post without using the custom PHP template, you can paste this snippet into a **Custom HTML** block in the WordPress block editor:

```html
<!-- AI Wave Scorecard Seamless Embed -->
<div id="ai-wave-wrapper" style="width:100%; min-height:92vh; position:relative; background:#0b0f19;">
  <iframe
    id="ai-wave-embed-frame"
    src="https://ai-wave-scorecard.vercel.app"
    style="width:100%; min-height:92vh; border:none; display:block;"
    allow="autoplay; clipboard-write; fullscreen"
    loading="eager"
  ></iframe>
</div>

<script>
(function() {
  var frame = document.getElementById('ai-wave-embed-frame');
  if (!frame) return;

  // Pass ?owner or other query strings to the embed
  if (window.location.search) {
    try {
      var u = new URL(frame.src);
      new URLSearchParams(window.location.search).forEach(function(v, k) { u.searchParams.set(k, v); });
      frame.src = u.toString();
    } catch(e) {}
  }

  // Auto-resize height to prevent double scrollbars
  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'ai-wave-scorecard' && e.data.type === 'resize') {
      frame.style.height = Math.max(e.data.height, window.innerHeight * 0.9) + 'px';
    }
  });
})();
</script>
```

---

## 2-Minute Vercel Deployment Guide

To get your live app endpoint running on Vercel:

1. **Sign Up / Log In:** Go to [vercel.com](https://vercel.com) (free Hobby account).
2. **Import Repo:** Click **Add New > Project**, select GitHub, and choose `a-vip/ai-wave-scorecard`.
3. **Environment Variables:** In the Project Settings before clicking Deploy, add:
   - `DATABASE_URL`: Your serverless Postgres connection string from [Neon.tech](https://neon.tech) (free).
   - `ADMIN_TOKEN`: Your secret password for unlocking the owner responses view (`/?owner`).
   - `NEXT_PUBLIC_SITE_URL`: `https://aviperera.com/ai-wave`
4. **Deploy:** Click **Deploy**. Vercel will build and launch your application with automatic SSL in under 60 seconds.
