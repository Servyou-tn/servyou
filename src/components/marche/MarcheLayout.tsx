import type { ReactNode } from 'react'
import { MarcheSidebar } from './MarcheSidebar'
import { MarcheTopBar } from './MarcheTopBar'
import type { TopBarUser } from './ProfileAvatarMenu'

type SearchType = 'product' | 'service'

// The shared /marche app shell: a full-width sticky top bar across the top, and below it the
// locked sidebar (left) + the page content (right), both starting at the same Y. The browse
// engines (/marche/produits, /marche/services), the search engine (/recherche), /categories,
// and the three account pages all render through this so they read as one coherent app. The
// top bar is the global marketplace search everywhere — its toggle + search target
// /recherche; sub-pages just inherit its initial type/query.
//
// The bar publishes its own height into the --marche-topbar-h CSS variable (it varies — the
// homepage welcome makes it taller than the browse pages), and the sidebar sticks directly
// beneath it using that variable, so the two never drift out of alignment.
//
// `sidebarFilter` is the scoped filter panel for an active browse engine: the engine page
// builds it (server-fetched, type-scoped categories) and the sidebar slots it beneath the
// active Produits/Services sub-item. Every other page omits it.
export function MarcheLayout({
  user,
  searchType = 'product',
  searchQuery = '',
  sidebarFilter,
  heading,
  subtitle,
  children,
}: {
  user: TopBarUser | null
  searchType?: SearchType
  searchQuery?: string
  sidebarFilter?: ReactNode
  // Optional top-bar welcome (greeting + quiet subtitle), shown in the bar's left slot.
  // Only the consumer homepage passes these; every other page omits them.
  heading?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarcheTopBar
        user={user}
        initialType={searchType}
        initialQuery={searchQuery}
        heading={heading}
        subtitle={subtitle}
      />
      <div className="flex flex-1">
        <MarcheSidebar sidebarFilter={sidebarFilter} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
