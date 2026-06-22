// Scopes the marketplace surface to /marche (and its future sub-routes) only — the
// landing page and every other route keep their own backgrounds. The marche shell now
// uses a pure-white content surface (the cards carry their own blue-tinted border +
// shadow via .card-premium, so they read against white). The global Header (root layout)
// already hides itself off '/', so /marche's only top bar is the one inside its page.
export default function MarcheLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>
}
