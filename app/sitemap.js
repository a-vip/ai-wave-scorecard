const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");

export default function sitemap() {
  if (!base) return [];
  return [{ url: `${base}/`, changeFrequency: "monthly", priority: 1 }];
}
