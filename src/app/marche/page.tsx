import { MarcheSidebar } from '@/components/marche/MarcheSidebar'
import { SharedSearchBar } from '@/components/dashboard/shell/SharedSearchBar'

// The /marche marketplace browse page — public (no auth gate for now). The
// sidebar + a top-bar search (Produits/Services toggle) are in place; product and
// service listings arrive in follow-up commits.
export default function MarchePage() {
  return (
    <div className="flex">
      <MarcheSidebar />
      <main className="flex-1 px-6 py-10">
        {/* Top bar — only the search for now. Avatar, bell, and other elements
            arrive once their supporting pages exist. SharedSearchBar keeps the
            search on /marche (basePath) instead of the deleted /recherche. */}
        <div className="max-w-2xl">
          <SharedSearchBar basePath="/marche" />
        </div>

        <div className="mt-8 flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm font-medium text-text-muted">
          Coming next: products, services
        </div>
      </main>
    </div>
  )
}
