/** @type {import('next').NextConfig} */

// The replica is a self-contained page with inline <script>/<style> and inline event handlers,
// so script/style need 'unsafe-inline'. Everything else is locked to same-origin except the
// two Google Fonts hosts the original uses. frame-ancestors lets the page be iframed only by itself
// or aviperera.com (and subdomains), in case you embed it in the main site.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://aviperera.com https://*.aviperera.com",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  compress: true,

  // The replica frontend is a single generated file at public/index.html (see scripts/prepare.mjs).
  // Serve it at "/" so relative asset paths (art/, audio/) and /api/responses resolve exactly as on the original.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // Filenames are not content-hashed, so no "immutable": a week, then revalidate in the background.
        source: "/:dir(art|audio)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/favicon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
