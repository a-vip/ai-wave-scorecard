const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
