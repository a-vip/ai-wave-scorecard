// Minimal root layout. The public site is served from public/index.html via a rewrite;
// this layout exists only so the App Router can host API routes and future React pages.
export const metadata = {
  title: "AI Wave Scorecard",
  description: "Find where you stand on the AI wave: a free self-assessment from MetaLearning AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
