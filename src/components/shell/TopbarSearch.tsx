'use client'

import { useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { searchPlaceholderKey } from './shell-search'

// Topbar search (design system Section 3.3). The placeholder is context-aware via the current
// route (shell-search.ts); on submit it routes to the global /recherche engine. Wiring true
// in-list search ("filter my orders") is page behavior, deferred past the shell PR.
export function TopbarSearch() {
  const lang = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const placeholder = t(searchPlaceholderKey(pathname), lang)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    router.push(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : '/recherche')
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
        className={cn(
          'h-10 w-full rounded-lg border border-border-subtle bg-surface-subtle ps-9 pe-3 text-body-sm text-text-primary placeholder:text-text-muted',
          'focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600/30',
        )}
      />
    </form>
  )
}
