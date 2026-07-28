'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Search, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { MENU_CONTENT, MENU_ITEM, POPOVER_CONTENT } from '@/components/ui/menu-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import type { SearchSort } from '@/lib/search/search-params'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// The desktop (lg+) filter bar for /marche/services — the Figma moves filtering out of the
// sidebar into a top bar (611:45644): an in-page search, single-select Catégorie / Ville
// dropdowns, a Prix range popover, and a sort dropdown (all radius 10, border-strong,
// content-hug width), with a row of dismissible active-filter chips beneath. Every control
// writes to the URL (buildSearchQuery → router.push); the server page re-fetches.
//
// Ville filters on the freelancer's city THROUGH the services→freelancer join, and only when a
// city is picked — it is never a gate (see applyServiceFilters). The option list is DB-driven
// (cities that actually have active listings), so no option can return zero results.
//
// The Figma's icon-only grid/list view toggle is intentionally omitted (no list-card layout is
// designed yet). Mobile keeps the existing SearchFiltersSheet — Ville parity there is a logged
// follow-up, since that sheet is shared with /recherche.

type Props = {
  categories: FilterCategory[]
  cities: string[]
  selectedCategorie: string[]
  ville: string | null
  prixMin: number | null
  prixMax: number | null
  tri: SearchSort
  q: string
  basePath: string
}

// The three sorts offered on the browse surface (pertinence is a typed-search concept — it
// degrades to newest-first on an empty query — so the default maps to "Plus récents").
const SORT_OPTIONS: SearchSort[] = ['recent', 'prix_asc', 'prix_desc']

// Figma 611:45644 control: 40px tall, radius 10, border-strong hairline, 16px inset, content-hug.
// rounded-[10px] is deliberate — `--radius-lg` IS 10px in tokens.css, but it lives in :root and is
// NOT wired into @theme, so Tailwind's `rounded-lg` still resolves to its built-in 8px. See the
// radius follow-up in docs/follow-ups.md.
const TRIGGER =
  'inline-flex h-10 items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-white px-4 text-body-sm transition-colors hover:border-text-muted'

// The dropdown-menu / popover overrides moved to components/ui/menu-styles at their third
// consumer (G8's sort select) — the strings are unchanged, only their home is shared now.

export function ServicesFilterBar({
  categories,
  cities,
  selectedCategorie,
  ville,
  prixMin,
  prixMax,
  tri,
  q,
  basePath,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()

  const [query, setQuery] = useState(q)
  const [priceOpen, setPriceOpen] = useState(false)
  const [min, setMin] = useState(prixMin != null ? String(prixMin) : '')
  const [max, setMax] = useState(prixMax != null ? String(prixMax) : '')

  function push(patch: Parameters<typeof buildSearchQuery>[1]) {
    const qs = buildSearchQuery(sp, patch, { resetPage: true })
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  const label = (c: FilterCategory) => (lang === 'ar' ? c.name_ar : c.name_fr)
  const catName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug)
    return c ? label(c) : slug
  }

  const activeCategory = selectedCategorie[0] ?? ''
  const sortValue: SearchSort = tri === 'prix_asc' || tri === 'prix_desc' ? tri : 'recent'
  const priceActive = prixMin != null || prixMax != null

  const priceChipLabel = () => {
    const cur = t('services.filters.currency', lang)
    if (prixMin != null && prixMax != null) return `${prixMin}–${prixMax} ${cur}`
    if (prixMin != null) return `≥ ${prixMin} ${cur}`
    return `≤ ${prixMax} ${cur}`
  }

  const hasActive =
    selectedCategorie.length > 0 || Boolean(ville) || priceActive || q.trim() !== ''

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search — submits on Enter, drives the q param. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            push({ q: query.trim() || null })
          }}
          className="min-w-0 flex-1"
          role="search"
        >
          <div
            className="flex h-10 items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 focus-within:border-brand-blue-600"
          >
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('services.filters.searchPlaceholder', lang)}
              aria-label={t('services.filters.searchPlaceholder', lang)}
              className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </form>

        {/* Catégorie — single-select. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`${TRIGGER} ${activeCategory ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
          >
            <span className="truncate">
              {activeCategory ? catName(activeCategory) : t('search.filters.category', lang)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`max-h-80 w-64 overflow-y-auto ${MENU_CONTENT}`}
          >
            <DropdownMenuRadioGroup
              value={activeCategory}
              onValueChange={(v) => push({ categorie: v ? [v] : null })}
            >
              <DropdownMenuRadioItem value="" className={MENU_ITEM}>
                {t('services.filters.categoryAll', lang)}
              </DropdownMenuRadioItem>
              {categories.map((c) => (
                <DropdownMenuRadioItem key={c.slug} value={c.slug} className={MENU_ITEM}>
                  {label(c)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ville — single-select freelancer city. DB-driven: only cities with ≥1 active
            listing, so every option returns results. Hidden entirely when the catalog has no
            cities yet (a dropdown with only "Toutes les villes" teaches nothing). */}
        {cities.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${TRIGGER} ${ville ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
            >
              <span className="truncate">{ville ?? t('services.filters.ville', lang)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={`max-h-80 w-56 overflow-y-auto ${MENU_CONTENT}`}
            >
              <DropdownMenuRadioGroup
                value={ville ?? ''}
                onValueChange={(v) => push({ ville: v || null })}
              >
                <DropdownMenuRadioItem value="" className={MENU_ITEM}>
                  {t('services.filters.cityAll', lang)}
                </DropdownMenuRadioItem>
                {/* City names are free-text DB values (proper nouns) — not translated. */}
                {cities.map((c) => (
                  <DropdownMenuRadioItem key={c} value={c} className={MENU_ITEM}>
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Prix — min/max range popover. */}
        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger
            className={`${TRIGGER} ${priceActive ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
          >
            <span>{t('services.filters.priceTrigger', lang)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="start" className={`w-64 ${POPOVER_CONTENT}`}>
            <p className="mb-3 text-body-sm font-semibold text-text-primary">
              {t('search.filters.price', lang)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder={t('search.filters.priceMin', lang)}
                aria-label={t('search.filters.priceMin', lang)}
                className={`w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted ${FOCUS_RING}`}
              />
              <span aria-hidden="true" className="text-text-muted">
                –
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder={t('search.filters.priceMax', lang)}
                aria-label={t('search.filters.priceMax', lang)}
                className={`w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted ${FOCUS_RING}`}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPriceOpen(false)
                push({ prix_min: min.trim() || null, prix_max: max.trim() || null })
              }}
              className={`mt-3 w-full rounded-lg bg-brand-blue-600 px-4 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
            >
              {t('search.filters.apply', lang)}
            </button>
          </PopoverContent>
        </Popover>

        {/* Trier par — sort. */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${TRIGGER} text-text-primary ${FOCUS_RING}`}>
            <span className="truncate">
              {t('services.sort.label', lang)} : {t(`services.sort.${sortValue}`, lang)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-56 ${MENU_CONTENT}`}>
            <DropdownMenuRadioGroup
              value={sortValue}
              onValueChange={(v) => push({ tri: v === 'recent' ? null : v })}
            >
              {SORT_OPTIONS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className={MENU_ITEM}>
                  {t(`services.sort.${s}`, lang)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active-filter chips + clear-all. */}
      {hasActive && (
        <div className="flex flex-wrap items-center gap-2">
          {q.trim() !== '' && (
            <FilterChip label={`« ${q} »`} onRemove={() => push({ q: null })} lang={lang} />
          )}
          {selectedCategorie.map((slug) => (
            <FilterChip
              key={slug}
              label={catName(slug)}
              onRemove={() => push({ categorie: selectedCategorie.filter((s) => s !== slug) })}
              lang={lang}
            />
          ))}
          {ville && (
            <FilterChip label={ville} onRemove={() => push({ ville: null })} lang={lang} />
          )}
          {priceActive && (
            <FilterChip
              label={priceChipLabel()}
              onRemove={() => push({ prix_min: null, prix_max: null })}
              lang={lang}
            />
          )}
          <button
            type="button"
            onClick={() =>
              push({ categorie: null, ville: null, prix_min: null, prix_max: null, q: null })
            }
            className={`rounded-full px-3 py-1 text-body-sm font-semibold text-brand-blue-600 underline-offset-2 hover:underline ${FOCUS_RING}`}
          >
            {t('services.filters.clearAll', lang)}
          </button>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  onRemove,
  lang,
}: {
  label: string
  onRemove: () => void
  lang: Lang
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-50 py-1 pe-2 ps-3 text-body-sm font-medium text-brand-blue-600">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('services.filters.removeFilter', lang, { filter: label })}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-blue-100 ${FOCUS_RING}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}
