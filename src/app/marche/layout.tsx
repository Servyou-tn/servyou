// Scopes the marketplace's cool gray-blue background to /marche (and its future
// sub-routes) only — the landing page and every other route keep their own
// backgrounds. The global Header (root layout) already hides itself off '/', so
// /marche has no top bar yet; its own top bar ships in a follow-up commit.
export default function MarcheLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-200">{children}</div>
}
