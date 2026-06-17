'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, HOVER_SHADOW } from '@/components/layout/styles'
import { SearchIcon } from '@/components/dashboard/consumer/icons'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'

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
  toggleHref,
}: {
  initialQuery?: string
  initialType?: SearchType
  basePath?: string
  // When true (the /marche sticky top bar, once content has scrolled under it), the
  // pill swaps its solid white surface for a translucent blurred one so cards reading
  // underneath stay legible. Defaults to false — every other caller (e.g. /recherche)
  // keeps the original solid bg-white, untouched.
  scrolled?: boolean
  // When provided, toggling the catalog navigates to `toggleHref(nextType)` instead of
  // re-running the search at `basePath` — the marketplace browse engines pass this so the
  // toggle becomes the cross-engine compass (Produits ⇄ Services). The text-search submit
  // still targets `basePath` (→ /recherche). Omitted everywhere else (/recherche, the
  // dashboard), where the toggle re-runs the search at `basePath` — behavior unchanged.
  toggleHref?: (type: SearchType) => string
}) {
  const router = useRouter()
  const lang = useLang()
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState<SearchType>(initialType)

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
    // Optimistic local update so the active pill is correct immediately, whether or not the
    // shell remounts on the navigation that follows.
    setType(next)
    if (toggleHref) {
      // Cross-engine compass: jump to the clean other browse engine (no carried query).
      router.push(toggleHref(next))
      return
    }
    navigate(next, query)
  }

  const typeOptions: SegmentedControlOption<SearchType>[] = [
    { value: 'product', label: t('common.products_section', lang) },
    { value: 'service', label: t('common.services_section', lang) },
  ]

  return (
    // Premium pill: search icon (breathing room on the left), the input, then the
    // Produits/Services segmented toggle on a soft gray track. Whisper shadow at rest,
    // lifting on hover/focus-within. Search + toggle only — nothing else.
    <form
      onSubmit={onSubmit}
      className={`outline-brand flex h-14 w-full items-center rounded-full transition-all duration-300 ease-out ${
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
      <SegmentedControl
        options={typeOptions}
        value={type}
        onChange={selectType}
        ariaLabel={t('home.search_btn', lang)}
        className="mr-2 shrink-0"
      />
    </form>
  )
}
