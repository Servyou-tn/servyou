'use client'

import { useId, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FilterControl } from '@/components/ui/filter-control'
import { buildSearchQuery } from './search-url'

export type FilterCategory = { slug: string; name_fr: string; name_ar: string }

type Props = {
  categories: FilterCategory[]
  selectedCategorie: string[]
  prixMin: number | null
  prixMax: number | null
  // 'inline' (desktop sidebar) applies on every change; 'sheet' (mobile) batches the
  // draft until the "Appliquer" button is pressed.
  mode: 'inline' | 'sheet'
  onApplied?: () => void
  // Where filter changes navigate. /recherche by default; /categories/[slug] passes its
  // own path so the slug stays in the URL.
  basePath?: string
  // /categories/[slug] hides the Catégorie section (the slug already locks the category).
  showCategory?: boolean
}

// A single collapsible filter group for the inline (desktop) filter: an Upwork-style row
// header (label + an optional active-count badge when collapsed + a chevron) that toggles a
// smooth-collapsing panel of inputs. Module-level so it isn't re-created on every render of
// SearchFilters (which would remount its children each keystroke).
function CollapsibleGroup({
  label,
  badge,
  open,
  onToggle,
  panelId,
  ariaShow,
  ariaHide,
  children,
}: {
  label: string
  // The active-count badge text ('2', '1', 'actif', …), or null when there's nothing to flag.
  badge: string | null
  open: boolean
  onToggle: () => void
  panelId: string
  ariaShow: string
  ariaHide: string
  children: ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? ariaHide : ariaShow}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 py-3 text-start text-body-sm font-semibold uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary ${FOCUS_RING}`}
      >
        <span className="flex items-baseline gap-1.5">
          <span>{label}</span>
          {/* Count badge only when collapsed — open groups show the real selections. */}
          {!open && badge && (
            <span className="font-semibold normal-case text-brand-blue-600">({badge})</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ease-in-out ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      {/* grid-rows 1fr→0fr animates height to auto with no magic number; opacity adds the
          fade; inert drops the clipped inputs out of the tab order when collapsed. */}
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

// The shared filter form (category / price). On desktop ('inline') each group is an
// independently collapsible Upwork-style row — all collapsed by default; a collapsed group
// with active selections shows a count badge (or "actif" for the price range). In the mobile
// bottom sheet ('sheet') the groups stay as always-open fieldsets (the collapse pattern
// doesn't fit a one-shot sheet). State is seeded from the URL so the controls always reflect
// the active query.
export function SearchFilters({
  categories,
  selectedCategorie,
  prixMin,
  prixMax,
  mode,
  onApplied,
  basePath = '/recherche',
  showCategory = true,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()
  const lang = useLang()
  const groupId = useId()

  const [cat, setCat] = useState<string[]>(selectedCategorie)
  const [min, setMin] = useState(prixMin != null ? String(prixMin) : '')
  const [max, setMax] = useState(prixMax != null ? String(prixMax) : '')

  // Each inline group collapses independently; all closed by default. No persistence — a
  // route change (engine switch on /marche, or moving between filter surfaces) resets them to
  // closed. Refining filters only changes the query string (same pathname), so it leaves the
  // open/closed state alone. (Same pathname-reset pattern as the Marché chevron toggle.)
  const [categorieOpen, setCategorieOpen] = useState(false)
  const [prixOpen, setPrixOpen] = useState(false)
  // Reset the open-states on route change without an effect (adjust state during render).
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setCategorieOpen(false)
    setPrixOpen(false)
  }

  const hasActive = cat.length > 0 || min.trim() !== '' || max.trim() !== ''

  function apply(next: { cat?: string[]; min?: string; max?: string }) {
    const c = next.cat ?? cat
    const lo = (next.min ?? min).trim()
    const hi = (next.max ?? max).trim()
    const qs = buildSearchQuery(
      sp,
      { categorie: c, prix_min: lo === '' ? null : lo, prix_max: hi === '' ? null : hi },
      { resetPage: true },
    )
    router.push(qs ? `${basePath}?${qs}` : basePath)
    onApplied?.()
  }

  function toggleCat(slug: string) {
    const next = cat.includes(slug) ? cat.filter((s) => s !== slug) : [...cat, slug]
    setCat(next)
    if (mode === 'inline') apply({ cat: next })
  }

  function clearAll() {
    setCat([])
    setMin('')
    setMax('')
    if (mode === 'inline') {
      const qs = buildSearchQuery(
        sp,
        { categorie: null, prix_min: null, prix_max: null },
        { resetPage: true },
      )
      router.push(qs ? `${basePath}?${qs}` : basePath)
      onApplied?.()
    }
  }

  const heading = 'text-body-sm font-semibold uppercase tracking-wide text-text-muted'

  // ── Group contents (identical inputs in both modes) ─────────────────────────────
  const categoryList = (
    <div className="max-h-44 space-y-0.5 overflow-y-auto pe-1">
      {categories.map((c) => (
        <label
          key={c.slug}
          className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-text-primary"
        >
          <FilterControl
            type="checkbox"
            checked={cat.includes(c.slug)}
            onChange={() => toggleCat(c.slug)}
          />
          <span className="line-clamp-1">{lang === 'ar' ? c.name_ar : c.name_fr}</span>
        </label>
      ))}
    </div>
  )

  const prixInputs = (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label htmlFor="prix-min" className="sr-only">
          {t('search.filters.priceMin', lang)}
        </label>
        <input
          id="prix-min"
          type="number"
          inputMode="numeric"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => mode === 'inline' && apply({})}
          placeholder={t('search.filters.priceMin', lang)}
          className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted ${FOCUS_RING}`}
        />
      </div>
      <span aria-hidden="true" className="text-text-muted">
        –
      </span>
      <div className="flex-1">
        <label htmlFor="prix-max" className="sr-only">
          {t('search.filters.priceMax', lang)}
        </label>
        <input
          id="prix-max"
          type="number"
          inputMode="numeric"
          min={0}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => mode === 'inline' && apply({})}
          placeholder={t('search.filters.priceMax', lang)}
          className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted ${FOCUS_RING}`}
        />
      </div>
    </div>
  )

  const clearButton = hasActive && (
    <button
      type="button"
      onClick={clearAll}
      className={`block w-full rounded-full px-4 py-2 text-center text-body-sm font-medium text-text-muted underline-offset-2 hover:underline ${FOCUS_RING}`}
    >
      {t('search.filters.clear', lang)}
    </button>
  )

  // ── Mobile bottom sheet — always-open fieldsets (unchanged) ──────────────────────
  if (mode === 'sheet') {
    return (
      <div className="space-y-6">
        {showCategory && categories.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={heading}>{t('search.filters.category', lang)}</legend>
            {categoryList}
          </fieldset>
        )}
        <fieldset className="space-y-2">
          <legend className={heading}>{t('search.filters.price', lang)}</legend>
          {prixInputs}
        </fieldset>

        <button
          type="button"
          onClick={() => apply({})}
          className={`w-full rounded-full bg-brand-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
        >
          {t('search.filters.apply', lang)}
        </button>

        {clearButton}
      </div>
    )
  }

  // ── Desktop inline — Upwork-style collapsible groups (no "Filtres" heading) ──────
  const prixActive = min.trim() !== '' || max.trim() !== ''
  return (
    <div className="space-y-4">
      <div className="divide-y divide-border-subtle">
        {showCategory && categories.length > 0 && (
          <CollapsibleGroup
            label={t('search.filters.category', lang)}
            badge={cat.length > 0 ? String(cat.length) : null}
            open={categorieOpen}
            onToggle={() => setCategorieOpen((o) => !o)}
            panelId={`${groupId}-categorie`}
            ariaShow="Afficher les catégories"
            ariaHide="Masquer les catégories"
          >
            {categoryList}
          </CollapsibleGroup>
        )}
        <CollapsibleGroup
          label={t('search.filters.price', lang)}
          badge={prixActive ? 'actif' : null}
          open={prixOpen}
          onToggle={() => setPrixOpen((o) => !o)}
          panelId={`${groupId}-prix`}
          ariaShow="Afficher le filtre de prix"
          ariaHide="Masquer le filtre de prix"
        >
          {prixInputs}
        </CollapsibleGroup>
      </div>

      {clearButton}
    </div>
  )
}
