'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Search, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { MENU_CONTENT, MENU_ITEM } from '@/components/ui/menu-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import type { FreelancerSort } from '@/lib/search/search-freelancers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// The filter bar of the « Freelances » lens of /marche/services — Figma 662:53894 (Filter Bar, desktop; 663:55017 mobile): an in-page search
// (44, « Rechercher un freelance… »), single-select Catégorie / Ville and a sort dropdown, then dismissible chips + « Tout effacer ». Every
// control writes to the URL (buildSearchQuery → router.push, `vue=freelances` is carried along) and the server page re-fetches.
//
// ⚑ A TRIMMED FORK of BoutiquesFilterBar (itself a fork of ProduitsFilterBar), on the same route-local-until-consolidated footing — the
// FOURTH copy, so the consolidation follow-up is now due (docs/follow-ups/freelances-lens.md).
// WHAT IS NOT HERE, ON PURPOSE (decisions D4, D5 in docs/design/freelances-lens-deltas.md):
//   • Prix — a freelancer has no price of their own (services do); the frame's Prix select is the services bar copied over.
//   • the frame's grid / list layout toggle — there is no list layout specimen.
// Below `lg` the same bar wraps (search full width, the selects beneath) — as the Boutiques lens does; the 375 frame draws only the search.

type Props = {
  categories: FilterCategory[]
  cities: string[]
  selectedCategorie: string[]
  ville: string | null
  tri: FreelancerSort
  q: string
  basePath: string
}

const SORT_OPTIONS: FreelancerSort[] = ['recent', 'nom']

// Same select look as the products / boutiques bars (rounded-[10px]: `rounded-lg` is 8px in Tailwind's theme here).
const TRIGGER =
  'inline-flex h-10 items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-white px-4 text-body-sm transition-colors hover:border-text-muted'

export function FreelancesFilterBar({ categories, cities, selectedCategorie, ville, tri, q, basePath }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [query, setQuery] = useState(q)

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
  const hasActive = selectedCategorie.length > 0 || Boolean(ville) || q.trim() !== ''

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            push({ q: query.trim() || null })
          }}
          // Full-width row on a phone (the selects wrap beneath it), the flexible first control on desktop.
          className="min-w-0 basis-full lg:basis-0 lg:flex-1"
          role="search"
        >
          <div className="flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 focus-within:border-brand-blue-600">
            <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('freelances.filters.searchPlaceholder', lang)}
              aria-label={t('freelances.filters.searchPlaceholder', lang)}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </form>

        {categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${TRIGGER} ${activeCategory ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
            >
              <span className="truncate">
                {activeCategory ? catName(activeCategory) : t('produits.filters.category', lang)}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={`max-h-80 w-64 overflow-y-auto ${MENU_CONTENT}`}>
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
        )}

        {cities.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${TRIGGER} ${ville ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
            >
              <span className="truncate">{ville ?? t('produits.filters.ville', lang)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={`max-h-80 w-56 overflow-y-auto ${MENU_CONTENT}`}>
              <DropdownMenuRadioGroup value={ville ?? ''} onValueChange={(v) => push({ ville: v || null })}>
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

        <DropdownMenu>
          <DropdownMenuTrigger className={`${TRIGGER} text-text-primary ${FOCUS_RING}`}>
            <span className="truncate">
              {t('produits.sort.label', lang)} : {t(`freelances.sort.${tri}`, lang)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-56 ${MENU_CONTENT}`}>
            <DropdownMenuRadioGroup value={tri} onValueChange={(v) => push({ tri: v === 'recent' ? null : v })}>
              {SORT_OPTIONS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className={MENU_ITEM}>
                  {t(`freelances.sort.${s}`, lang)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasActive && (
        <div className="flex flex-wrap items-center gap-2">
          {q.trim() !== '' && <FilterChip label={`« ${q} »`} onRemove={() => push({ q: null })} lang={lang} />}
          {selectedCategorie.map((slug) => (
            <FilterChip
              key={slug}
              label={catName(slug)}
              onRemove={() => push({ categorie: selectedCategorie.filter((s) => s !== slug) })}
              lang={lang}
            />
          ))}
          {ville && <FilterChip label={ville} onRemove={() => push({ ville: null })} lang={lang} />}
          <button
            type="button"
            onClick={() => push({ categorie: null, ville: null, q: null })}
            className={`rounded-full px-3 py-1 text-body-sm font-semibold text-brand-blue-600 underline-offset-2 hover:underline ${FOCUS_RING}`}
          >
            {t('produits.filters.clearAll', lang)}
          </button>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove, lang }: { label: string; onRemove: () => void; lang: Lang }) {
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
