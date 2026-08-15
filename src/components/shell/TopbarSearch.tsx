'use client'

import { useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { searchPlaceholderKey } from './shell-search'
import { MARCHE_ENGINE_PATHS } from '@/lib/marche/marche-routing'

// Topbar search (design system Section 3.3). The placeholder is context-aware via the current
// route (shell-search.ts); on submit it routes to the global /recherche engine. Wiring true
// in-list search ("filter my orders") is page behavior, deferred past the shell PR.
//
// type is inferred from PATHNAME, not carried in any client state (the shell holds none by
// design): on /marche/services it submits type=service, everywhere else it omits type (defaults
// to product via parseSearchParams). This fixes a live bug — this same submit used to push
// `/recherche?q=` with no type at all, so a visitor searching while browsing services was
// silently bounced to product results.
//
// Known scope limit, not fixed here: pathname-only means this does NOT re-derive type from
// /recherche?type=service or /categories/[slug]?type=service — searching from the topbar while
// already on a service-scoped /recherche or /categories page still resolves to product, because
// pathname alone can't see the current query string's type. Logged in docs/follow-ups.md.
// Post-migration those two pages carry type correctly through their OWN page-local search input
// (which reads the type it already has server-side) — this shell widget is the fallback path
// for every other page, not the primary way to search from within a type-scoped result set.
export function TopbarSearch() {
  const lang = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const placeholder = t(searchPlaceholderKey(pathname), lang)
  const onServicesEngine =
    pathname === MARCHE_ENGINE_PATHS.service || pathname.startsWith(MARCHE_ENGINE_PATHS.service + '/')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const trimmed = q.trim()
    if (trimmed) params.set('q', trimmed)
    if (onServicesEngine) params.set('type', 'service')
    const qs = params.toString()
    router.push(qs ? `/recherche?${qs}` : '/recherche')
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      <Search
        className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        // Plain template (not cn) so text-body-sm survives — tailwind-merge collapses it against
        // the text-{color} class and would otherwise drop the 14px size to 16px (see LanguageToggle).
        // rounded-[10px]: --radius-lg is 10px but is not wired into @theme (see docs/follow-ups.md).
        className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface-subtle ps-9 pe-3 text-body-sm text-text-primary placeholder:text-text-muted focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600/30"
      />
    </form>
  )
}
