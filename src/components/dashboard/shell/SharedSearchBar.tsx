'use client'

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { SearchIcon } from '@/components/dashboard/consumer/icons'

type SearchType = 'product' | 'service'

// Text input + binary Produits/Services segmented toggle. One catalog at a time.
// Submitting (Enter or the search button) navigates to /recherche?q=&type=; toggling
// a catalog navigates immediately. Both /mon-espace's top bar and /recherche use it.
export function SharedSearchBar({
  initialQuery = '',
  initialType = 'product',
}: {
  initialQuery?: string
  initialType?: SearchType
}) {
  const router = useRouter()
  const lang = useLang()
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState<SearchType>(initialType)
  const productRef = useRef<HTMLButtonElement>(null)
  const serviceRef = useRef<HTMLButtonElement>(null)

  function navigate(nextType: SearchType, nextQuery: string) {
    const params = new URLSearchParams()
    const q = nextQuery.trim()
    if (q) params.set('q', q)
    params.set('type', nextType)
    router.push(`/recherche?${params.toString()}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    navigate(type, query)
  }

  function selectType(next: SearchType) {
    if (next === type) return
    setType(next)
    navigate(next, query)
  }

  // Left/Right arrows move between the two toggle options (segmented-control pattern).
  function onToggleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next: SearchType = type === 'product' ? 'service' : 'product'
    setType(next)
    ;(next === 'product' ? productRef : serviceRef).current?.focus()
    navigate(next, query)
  }

  const pill = `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${FOCUS_RING}`

  return (
    <form onSubmit={onSubmit} className="flex h-11 w-full items-center gap-1 rounded-xl border border-border-subtle bg-white px-2">
      <button
        type="submit"
        aria-label={t('home.search_btn', lang)}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
      >
        <SearchIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('home.search_btn', lang)}
        placeholder={t('dashboard.topbar.searchPlaceholder', lang)}
        className="min-w-0 flex-1 border-0 bg-transparent px-1 text-[15px] text-text-primary outline-none placeholder:text-text-muted"
      />
      <fieldset className="flex shrink-0 items-center gap-1" onKeyDown={onToggleKeyDown}>
        <legend className="sr-only">{t('home.search_btn', lang)}</legend>
        <button
          ref={productRef}
          type="button"
          aria-pressed={type === 'product'}
          onClick={() => selectType('product')}
          className={`${pill} ${type === 'product' ? 'bg-brand-accent text-white' : 'text-text-muted hover:bg-surface-pill'}`}
        >
          {t('common.products_section', lang)}
        </button>
        <button
          ref={serviceRef}
          type="button"
          aria-pressed={type === 'service'}
          onClick={() => selectType('service')}
          className={`${pill} ${type === 'service' ? 'bg-brand-accent text-white' : 'text-text-muted hover:bg-surface-pill'}`}
        >
          {t('common.services_section', lang)}
        </button>
      </fieldset>
    </form>
  )
}
