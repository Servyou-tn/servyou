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

// The desktop (lg+) filter bar for /marche/produits — Figma 570:40225: an in-page search, then
// single-select Catégorie / Ville, a Prix range popover and a sort dropdown, with a row of
// dismissible active-filter chips beneath. Every control writes to the URL
// (buildSearchQuery → router.push); the server page re-fetches.
//
// ⚑ FORKED FROM `ServicesFilterBar`, per the skill's route-local-until-the-third-consumer rule.
// The two are ~90% identical and the measured deltas are small but real — search field 44 here vs
// 40 there, no lens icons, its own i18n namespace. Deltas are tabulated in docs/follow-ups.md so
// the eventual `MarketplaceFilterBar` consolidation does not re-derive them. Do NOT generalize the
// services bar in place: it ships on a working page and this PR is not its rebuild.
//
// Ville filters on the SHOP's city through the products→shops join, and only when a city is picked
// — never a gate (see applyProductFilters). The option list is DB-driven (cities that actually have
// active listings), so no option can return zero results.

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

// The three sorts offered on the browse surface. `pertinence` is a typed-search concept that
// degrades to newest-first on an empty query, so the default maps to "Plus récents" — which is
// also what 570:40225 draws in the trigger.
const SORT_OPTIONS: SearchSort[] = ['recent', 'prix_asc', 'prix_desc']

// Figma 570:40225 select: 40px tall, radius 10, border-strong hairline, 16px inset.
// rounded-[10px] is deliberate — `--radius-lg` IS 10px in tokens.css, but it lives in :root and is
// NOT wired into @theme, so Tailwind's `rounded-lg` still resolves to its built-in 8px.
const TRIGGER =
  'inline-flex h-10 items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-white px-4 text-body-sm transition-colors hover:border-text-muted'

export function ProduitsFilterBar({
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
  // ⚑ NORMALIZED, NOT PASSED THROUGH. `parseSearchParams` defaults `tri` to 'pertinence', which has
  // no entry under produits.sort.* — rendering it raw would put the literal key on screen. The
  // frame's trigger reads "Trier par : Plus récents", so the default folds to 'recent'.
  const sortValue: SearchSort = tri === 'prix_asc' || tri === 'prix_desc' ? tri : 'recent'
  const priceActive = prixMin != null || prixMax != null

  const priceChipLabel = () => {
    const cur = t('produits.filters.currency', lang)
    if (prixMin != null && prixMax != null) return `${prixMin}–${prixMax} ${cur}`
    if (prixMin != null) return `≥ ${prixMin} ${cur}`
    return `≤ ${prixMax} ${cur}`
  }

  const hasActive =
    selectedCategorie.length > 0 || Boolean(ville) || priceActive || q.trim() !== ''

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search — submits on Enter, drives the q param. The field is 44 tall (the frame's one
            real divergence from the services bar); the 40px controls beside it centre against it. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            push({ q: query.trim() || null })
          }}
          className="min-w-0 flex-1"
          role="search"
        >
          <div className="flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 focus-within:border-brand-blue-600">
            <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('produits.filters.searchPlaceholder', lang)}
              aria-label={t('produits.filters.searchPlaceholder', lang)}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </form>

        {/* Catégorie — single-select, DB-driven (the frame's hardcoded list is a separate
            taxonomy-reconciliation migration). */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`${TRIGGER} ${activeCategory ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
          >
            <span className="truncate">
              {activeCategory ? catName(activeCategory) : t('produits.filters.category', lang)}
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
                {t('produits.filters.categoryAll', lang)}
              </DropdownMenuRadioItem>
              {categories.map((c) => (
                <DropdownMenuRadioItem key={c.slug} value={c.slug} className={MENU_ITEM}>
                  {label(c)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ville — single-select shop city. Hidden entirely when the catalog has no cities yet: a
            dropdown whose only option is "Toutes les villes" teaches nothing. */}
        {cities.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${TRIGGER} ${ville ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
            >
              <span className="truncate">{ville ?? t('produits.filters.ville', lang)}</span>
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
                  {t('produits.filters.cityAll', lang)}
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
            <span>{t('produits.filters.priceTrigger', lang)}</span>
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
              {t('produits.sort.label', lang)} : {t(`produits.sort.${sortValue}`, lang)}
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
                  {t(`produits.sort.${s}`, lang)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active-filter chips + clear-all — the frame's chips-row (hidden in the default state,
          shown by the "filtres actifs" specimen 571:40540). */}
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
          {ville && <FilterChip label={ville} onRemove={() => push({ ville: null })} lang={lang} />}
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
            {t('produits.filters.clearAll', lang)}
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
        aria-label={t('produits.filters.removeFilter', lang, { filter: label })}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-blue-100 ${FOCUS_RING}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}
