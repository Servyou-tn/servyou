'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToggleType } from '@/lib/search/search-params'

// Compact, premium search pill that expands on focus (Google-style). On desktop it's ~200px
// collapsed and grows to ~420px while focused OR while it holds a value (so blurring with
// content keeps it open; blurring empty collapses it). On mobile it's full-width (its own row,
// no expand). Focus paints a brand-accent border + soft ring glow and tints the icon. The clear
// (×) button shows only when there's a value. Enter submits to /recherche?q=&type=<toggle type>.
export function ExpandableSearch({
  currentType,
  initialQuery = '',
}: {
  currentType: ToggleType
  initialQuery?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const hasValue = query.trim().length > 0
  const expanded = focused || hasValue

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
        'group flex h-11 items-center gap-2 rounded-full border border-border-subtle bg-white px-3.5 transition-all duration-300 ease-out',
        'focus-within:border-brand-accent/50 focus-within:shadow-sm focus-within:ring-4 focus-within:ring-brand-accent/10',
        // Mobile: full width (own row). Desktop: compact, expanding on focus / when it has a value.
        'w-full',
        expanded ? 'md:w-[420px] md:max-w-[40vw]' : 'md:w-[200px]',
      )}
    >
      <Search
        className="h-4 w-4 shrink-0 text-text-muted transition-colors group-focus-within:text-brand-accent"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Rechercher"
        placeholder="Rechercher…"
        className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-text-primary outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          aria-label="Effacer la recherche"
          className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}
