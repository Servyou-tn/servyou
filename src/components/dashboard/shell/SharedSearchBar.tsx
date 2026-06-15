'use client'

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, HOVER_SHADOW } from '@/components/layout/styles'
import { SearchIcon } from '@/components/dashboard/consumer/icons'

type SearchType = 'product' | 'service'

// Text input + binary Produits/Services segmented toggle. One catalog at a time.
// Submitting (Enter or the search button) navigates to `${basePath}?q=&type=`; toggling
// a catalog navigates immediately. `basePath` defaults to /recherche (the original
// results page); /marche passes its own path so the search stays on that page.
export function SharedSearchBar({
  initialQuery = '',
  initialType = 'product',
  basePath = '/recherche',
  scrolled = false,
}: {
  initialQuery?: string
  initialType?: SearchType
  basePath?: string
  // When true (the /marche sticky top bar, once content has scrolled under it), the
  // pill swaps its solid white surface for a translucent blurred one so cards reading
  // underneath stay legible. Defaults to false — every other caller (e.g. /recherche)
  // keeps the original solid bg-white, untouched.
  scrolled?: boolean
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
    router.push(`${basePath}?${params.toString()}`)
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

  // Each toggle segment is its own rounded-full pill inside the gray track: filled
  // brand-accent when active (the only brand color in the bar), plain dark text when not.
  const segment = `rounded-full px-5 py-1.5 text-[13px] font-medium transition-all duration-200 ${FOCUS_RING}`

  return (
    // Premium pill: search icon (breathing room on the left), the input, then the
    // Produits/Services segmented toggle on a soft gray track. Whisper shadow at rest,
    // lifting on hover/focus-within. Search + toggle only — nothing else.
    <form
      onSubmit={onSubmit}
      className={`flex h-14 w-full items-center rounded-full transition-all duration-300 ease-out ${
        scrolled ? 'bg-white/80 backdrop-blur-md' : 'bg-white'
      } ${CARD_SHADOW} ${HOVER_SHADOW} focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.08)]`}
    >
      <button
        type="submit"
        aria-label={t('home.search_btn', lang)}
        className={`ml-5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8B8B8B] ${FOCUS_RING}`}
      >
        <SearchIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('home.search_btn', lang)}
        placeholder={t('dashboard.topbar.searchPlaceholder', lang)}
        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[14px] text-[#0A0A0A] outline-none placeholder:text-[#8B8B8B]"
      />
      <fieldset
        className="mr-2 flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#F4F4F4] p-1"
        onKeyDown={onToggleKeyDown}
      >
        <legend className="sr-only">{t('home.search_btn', lang)}</legend>
        <button
          ref={productRef}
          type="button"
          aria-pressed={type === 'product'}
          onClick={() => selectType('product')}
          className={`${segment} ${type === 'product' ? 'bg-brand-accent text-white shadow-sm' : 'text-[#0A0A0A]'}`}
        >
          {t('common.products_section', lang)}
        </button>
        <button
          ref={serviceRef}
          type="button"
          aria-pressed={type === 'service'}
          onClick={() => selectType('service')}
          className={`${segment} ${type === 'service' ? 'bg-brand-accent text-white shadow-sm' : 'text-[#0A0A0A]'}`}
        >
          {t('common.services_section', lang)}
        </button>
      </fieldset>
    </form>
  )
}
