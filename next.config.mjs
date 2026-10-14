/** @type {import('next').NextConfig} */
const nextConfig = {
  // The replica frontend is a single static file at public/index.html.
  // Serve it at "/" so relative asset paths (art/, audio/) and /api/responses resolve exactly as on the original.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
  async headers() {
    return [
      {
        source: "/:dir(art|audio)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
