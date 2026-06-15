import type { ReactNode } from 'react'
import { MarcheSidebar } from './MarcheSidebar'
import { MarcheTopBar } from './MarcheTopBar'
import type { TopBarUser } from './ProfileAvatarMenu'

type SearchType = 'product' | 'service'

// The shared /marche app shell: the locked full-width sidebar (left) + the sticky top
// bar (top of the right column) + the page content below. /marche and the three account
// pages (/mes-commandes, /mes-favoris, /mes-missions) all render through this so they
// read as one coherent app. The top bar is the global marketplace search everywhere —
// its toggle + search always target /marche; sub-pages just inherit it.
export function MarcheLayout({
  user,
  searchType = 'product',
  searchQuery = '',
  children,
}: {
  user: TopBarUser | null
  searchType?: SearchType
  searchQuery?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <MarcheSidebar />
      <main className="min-w-0 flex-1">
        <MarcheTopBar user={user} initialType={searchType} initialQuery={searchQuery} />
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  )
}
