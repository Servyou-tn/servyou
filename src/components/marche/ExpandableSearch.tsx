'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ToggleType } from '@/lib/search/search-params'

// Compact search pill that expands on focus (Google-style). Collapsed it's icon-only on mobile
// and ~160px on desktop; it expands to ~480px (capped to the viewport) while focused OR while
// it holds a typed value — so blurring with content keeps it open, blurring empty collapses it.
// Enter submits to /recherche?q=&type=<the current toggle type> (the icon just focuses/expands).
export function ExpandableSearch({
  currentType,
  initialQuery = '',
}: {
  currentType: ToggleType
  initialQuery?: string
}) {
  const router = useRouter()
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const expanded = focused || query.trim().length > 0

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('q', q)
    params.set('type', currentType)
    router.push(`/recherche?${params.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'relative flex h-11 shrink-0 items-center rounded-full border border-border-subtle bg-white transition-[width] duration-300 ease-in-out',
        // Capped to the viewport so it never overflows on small screens; animates smoothly.
        expanded ? 'w-[480px] max-w-[70vw]' : 'w-11 md:w-[160px]',
      )}
    >
      {/* The icon focuses the input (expands) rather than submitting — submit is Enter only. */}
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        aria-label={t('home.search_btn', lang)}
        className={cn(
          'absolute left-0 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted',
          FOCUS_RING,
        )}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={t('home.search_btn', lang)}
        placeholder={t('dashboard.topbar.searchPlaceholder', lang)}
        className="h-full w-full rounded-full border-0 bg-transparent pl-11 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
    </form>
  )
}
