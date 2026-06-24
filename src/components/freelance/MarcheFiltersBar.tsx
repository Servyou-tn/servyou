'use client'

import { useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { FilterControl } from '@/components/ui/filter-control'
import { buildSearchQuery } from '@/components/recherche/search-url'
import type { FilterCategory } from '@/components/recherche/SearchFilters'

// The marketplace (/marche/produits, /marche/services) horizontal filter bar — the freelancer
// counterpart to the consumer SearchFilters sidebar. Same Indeed/LinkedIn dropdown-chip pattern as
// the job board's JobBoardFiltersBar, but with the marketplace's two filters (Catégorie + Prix) and
// its EXISTING URL param contract (categorie / prix_min / prix_max), so the SAME searchMarketplace
// data path serves both the freelancer (bar) and consumer (sidebar) views. Reuses the existing
// search.filters.* i18n keys. A deliberate sibling of JobBoardFiltersBar rather than a shared
// generic — generalizing would mean refactoring the shipped /emplois bar; the small duplication
// (chip + bodies) is the accepted tradeoff and a future refactor can extract shared primitives.

type Props = {
  basePath: string // the browse-engine route (/marche/produits | /marche/services)
  categories: FilterCategory[]
  selectedCategorie: string[]
  prixMin: number | null
  prixMax: number | null
}

const chipBase =
  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors'
const applyBtn =
  'w-full rounded-full bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90'
const inputCls =
  'w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted'

// One filter chip — a popover trigger (label + active count) with portalled content.
function FilterChip({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const active = count > 0
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            chipBase,
            FOCUS_RING,
            active
              ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
              : 'border-border-subtle bg-white text-text-primary hover:bg-slate-50',
          )}
        >
          <span className="whitespace-nowrap">
            {label}
            {active ? ` (${count})` : ''}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-64 rounded-2xl border border-border-subtle bg-white p-4 shadow-lg"
        >
          {children(() => setOpen(false))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// Catégorie multi-select → the `categorie` param (comma-joined slugs, matching SearchFilters).
function CategoryBody({
  basePath,
  categories,
  selected,
  close,
}: {
  basePath: string
  categories: FilterCategory[]
  selected: string[]
  close: () => void
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [draft, setDraft] = useState<string[]>(selected)

  const toggle = (slug: string) =>
    setDraft((d) => (d.includes(slug) ? d.filter((s) => s !== slug) : [...d, slug]))

  const apply = () => {
    const qs = buildSearchQuery(sp, { categorie: draft }, { resetPage: true })
    close()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <div className="space-y-3">
      <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
        {categories.map((c) => (
          <label
            key={c.slug}
            className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-text-primary"
          >
            <FilterControl type="checkbox" checked={draft.includes(c.slug)} onChange={() => toggle(c.slug)} />
            <span className="line-clamp-1">{lang === 'ar' ? c.name_ar : c.name_fr}</span>
          </label>
        ))}
      </div>
      <button type="button" onClick={apply} className={cn(applyBtn, FOCUS_RING)}>
        {t('search.filters.apply', lang)}
      </button>
    </div>
  )
}

// Prix min/max → the `prix_min` / `prix_max` params (matching SearchFilters).
function PriceBody({
  basePath,
  prixMin,
  prixMax,
  close,
}: {
  basePath: string
  prixMin: number | null
  prixMax: number | null
  close: () => void
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [min, setMin] = useState(prixMin != null ? String(prixMin) : '')
  const [max, setMax] = useState(prixMax != null ? String(prixMax) : '')

  const apply = () => {
    const qs = buildSearchQuery(
      sp,
      { prix_min: min.trim() === '' ? null : min.trim(), prix_max: max.trim() === '' ? null : max.trim() },
      { resetPage: true },
    )
    close()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="marche-prix-min" className="sr-only">
            {t('search.filters.priceMin', lang)}
          </label>
          <input
            id="marche-prix-min"
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={t('search.filters.priceMin', lang)}
            className={cn(inputCls, FOCUS_RING)}
          />
        </div>
        <span aria-hidden="true" className="text-text-muted">
          –
        </span>
        <div className="flex-1">
          <label htmlFor="marche-prix-max" className="sr-only">
            {t('search.filters.priceMax', lang)}
          </label>
          <input
            id="marche-prix-max"
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={t('search.filters.priceMax', lang)}
            className={cn(inputCls, FOCUS_RING)}
          />
        </div>
      </div>
      <button type="button" onClick={apply} className={cn(applyBtn, FOCUS_RING)}>
        {t('search.filters.apply', lang)}
      </button>
    </div>
  )
}

export function MarcheFiltersBar({ basePath, categories, selectedCategorie, prixMin, prixMax }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()

  const hasActive = selectedCategorie.length > 0 || prixMin != null || prixMax != null
  const priceCount = prixMin != null || prixMax != null ? 1 : 0

  // Clear only the filter keys — q / tri are preserved (mirrors SearchFilters.clearAll).
  const reset = () => {
    const qs = buildSearchQuery(sp, { categorie: null, prix_min: null, prix_max: null }, { resetPage: true })
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
      {categories.length > 0 && (
        <FilterChip label={t('search.filters.category', lang)} count={selectedCategorie.length}>
          {(close) => (
            <CategoryBody basePath={basePath} categories={categories} selected={selectedCategorie} close={close} />
          )}
        </FilterChip>
      )}

      <FilterChip label={t('search.filters.price', lang)} count={priceCount}>
        {(close) => <PriceBody basePath={basePath} prixMin={prixMin} prixMax={prixMax} close={close} />}
      </FilterChip>

      {hasActive && (
        <button
          type="button"
          onClick={reset}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-primary hover:underline',
            FOCUS_RING,
          )}
        >
          {t('search.filters.clear', lang)}
        </button>
      )}
    </div>
  )
}
