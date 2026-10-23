// Branded 404 using the same palette as the scorecard.
export const metadata = { title: "Page not found | AI Wave Scorecard", robots: { index: false } };

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#EEF3F4", color: "#10222A", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: 24, textAlign: "center" }}>
      <div>
        <svg viewBox="0 0 26 16" width="52" height="32" fill="none" stroke="#0D7C8C" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M1 11c3-6 6-6 8 0s5 6 8 0 5-6 8 0" /></svg>
        <h1 style={{ fontSize: 34, margin: "12px 0 8px" }}>That wave didn&apos;t land</h1>
        <p style={{ color: "#56707A", margin: "0 0 20px" }}>We couldn&apos;t find that page.</p>
        <a href="/" style={{ display: "inline-block", background: "#10222A", color: "#EEF3F4", textDecoration: "none", fontWeight: 800, padding: "12px 20px", borderRadius: 12 }}>Back to the scorecard</a>
      </div>
    </main>
  );
}
