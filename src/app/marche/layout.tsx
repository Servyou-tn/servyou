// Scopes the marketplace background to /marche (and its future sub-routes) only —
// the landing page and every other route keep their own backgrounds. #F0F0F0 is a
// warm-neutral light gray (no blue tilt) so the pure-white floating cards pop. The
// global Header (root layout) already hides itself off '/', so /marche's only top
// bar is the search row inside its page.
export default function MarcheLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F0F0F0]">{children}</div>
}
