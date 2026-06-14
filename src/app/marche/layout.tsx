// Scopes the marketplace background to /marche (and its future sub-routes) only —
// the landing page and every other route keep their own backgrounds. bg-neutral-200
// is a truly neutral gray (no blue tilt) so the pure-white floating cards pop. The
// global Header (root layout) already hides itself off '/', so /marche's only top
// bar is the search row inside its page.
export default function MarcheLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-200">{children}</div>
}
