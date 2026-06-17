'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { buildSearchQuery } from './search-url'

export type FilterCategory = { slug: string; name_fr: string; name_ar: string }

type Props = {
  categories: FilterCategory[]
  selectedCategorie: string[]
  selectedVille: string[]
  prixMin: number | null
  prixMax: number | null
  // 'inline' (desktop sidebar) applies on every change; 'sheet' (mobile) batches the
  // draft until the "Appliquer" button is pressed.
  mode: 'inline' | 'sheet'
  onApplied?: () => void
}

// The shared filter form (category / city / price). Used in the desktop sidebar and,
// in sheet mode, inside the mobile bottom sheet. State is seeded from the URL so the
// controls always reflect the active query.
export function SearchFilters({
  categories,
  selectedCategorie,
  selectedVille,
  prixMin,
  prixMax,
  mode,
  onApplied,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()

  const [cat, setCat] = useState<string[]>(selectedCategorie)
  const [ville, setVille] = useState<string[]>(selectedVille)
  const [min, setMin] = useState(prixMin != null ? String(prixMin) : '')
  const [max, setMax] = useState(prixMax != null ? String(prixMax) : '')

  const hasActive = cat.length > 0 || ville.length > 0 || min.trim() !== '' || max.trim() !== ''

  function apply(next: { cat?: string[]; ville?: string[]; min?: string; max?: string }) {
    const c = next.cat ?? cat
    const v = next.ville ?? ville
    const lo = (next.min ?? min).trim()
    const hi = (next.max ?? max).trim()
    const qs = buildSearchQuery(
      sp,
      { categorie: c, ville: v, prix_min: lo === '' ? null : lo, prix_max: hi === '' ? null : hi },
      { resetPage: true },
    )
    router.push(qs ? `/recherche?${qs}` : '/recherche')
    onApplied?.()
  }

  function toggleCat(slug: string) {
    const next = cat.includes(slug) ? cat.filter((s) => s !== slug) : [...cat, slug]
    setCat(next)
    if (mode === 'inline') apply({ cat: next })
  }

  function toggleVille(value: string) {
    const next = ville.includes(value) ? ville.filter((s) => s !== value) : [...ville, value]
    setVille(next)
    if (mode === 'inline') apply({ ville: next })
  }

  function clearAll() {
    setCat([])
    setVille([])
    setMin('')
    setMax('')
    if (mode === 'inline') {
      const qs = buildSearchQuery(
        sp,
        { categorie: null, ville: null, prix_min: null, prix_max: null },
        { resetPage: true },
      )
      router.push(qs ? `/recherche?${qs}` : '/recherche')
      onApplied?.()
    }
  }

  const heading = 'text-[13px] font-semibold uppercase tracking-wide text-[#6B6B6B]'

  return (
    <div className="space-y-6">
      {/* In the mobile sheet the dialog header already says "Filtres" — avoid the dupe. */}
      {mode === 'inline' && (
        <p className="text-base font-bold text-[#0A0A0A]">{t('search.filters.title', lang)}</p>
      )}

      {/* Catégorie */}
      {categories.length > 0 && (
        <fieldset className="space-y-2">
          <legend className={heading}>{t('search.filters.category', lang)}</legend>
          <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
            {categories.map((c) => (
              <label
                key={c.slug}
                className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]"
              >
                <input
                  type="checkbox"
                  checked={cat.includes(c.slug)}
                  onChange={() => toggleCat(c.slug)}
                  className={`h-4 w-4 shrink-0 rounded border-border-subtle text-brand-accent ${FOCUS_RING}`}
                />
                <span className="line-clamp-1">{lang === 'ar' ? c.name_ar : c.name_fr}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Ville */}
      <fieldset className="space-y-2">
        <legend className={heading}>{t('search.filters.city', lang)}</legend>
        <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
          {GOVERNORATES.map((g) => (
            <label
              key={g.value}
              className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]"
            >
              <input
                type="checkbox"
                checked={ville.includes(g.value)}
                onChange={() => toggleVille(g.value)}
                className={`h-4 w-4 shrink-0 rounded border-border-subtle text-brand-accent ${FOCUS_RING}`}
              />
              <span className="line-clamp-1">{lang === 'ar' ? g.ar : g.fr}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Prix */}
      <fieldset className="space-y-2">
        <legend className={heading}>{t('search.filters.price', lang)}</legend>
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
              className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING}`}
            />
          </div>
          <span aria-hidden="true" className="text-[#6B6B6B]">
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
              className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING}`}
            />
          </div>
        </div>
      </fieldset>

      {mode === 'sheet' && (
        <button
          type="button"
          onClick={() => apply({})}
          className={`w-full rounded-full bg-brand-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`}
        >
          {t('search.filters.apply', lang)}
        </button>
      )}

      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className={`block w-full rounded-full px-4 py-2 text-center text-[13px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline ${FOCUS_RING}`}
        >
          {t('search.filters.clear', lang)}
        </button>
      )}
    </div>
  )
}
