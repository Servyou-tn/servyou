'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FilterControl } from '@/components/ui/filter-control'
import { buildSearchQuery } from '@/components/recherche/search-url'
import type { FilterCategory } from '@/components/recherche/SearchFilters'

// The job-board filter form — category / budget / ville / compétences / posté il y a. Mirrors the
// consumer SearchFilters visual (Upwork-style collapsible groups inline; always-open fieldsets in
// the mobile sheet) but with the job-specific param set. It lives in the page content (a left rail
// at xl+, the sheet below), NOT in the nav sidebar, because the shared MarcheSidebar injects its
// filter only on /marche/* routes — and consumer code stays untouched.

export type JobFilterSelection = {
  categories: string[] // category slugs
  minBudget: number | null
  maxBudget: number | null
  cities: string[] // governorate canonical values
  skills: string[]
  postedWithin: number | null // 1 | 7 | 30 | null
}

export type CityOption = { value: string; label: string }

type Props = {
  // 'inline' (desktop rail) applies on every change; 'sheet' (mobile) batches until "Appliquer".
  mode: 'inline' | 'sheet'
  categories: FilterCategory[]
  cityOptions: CityOption[]
  skillOptions: string[]
  selected: JobFilterSelection
  onApplied?: () => void
}

const BASE = '/emplois'

// One collapsible group — the same Upwork-style row header + smooth-collapsing panel SearchFilters
// uses. Module-level so it isn't re-created each render (which would remount inputs on keystroke).
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
        className={`flex w-full cursor-pointer items-center justify-between gap-2 py-3 text-left text-[13px] font-semibold uppercase tracking-wide text-[#6B6B6B] transition-colors hover:text-[#0A0A0A] ${FOCUS_RING}`}
      >
        <span className="flex items-baseline gap-1.5">
          <span>{label}</span>
          {!open && badge && <span className="font-semibold normal-case text-brand-accent">({badge})</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6B6B6B] transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="pb-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

const heading = 'text-[13px] font-semibold uppercase tracking-wide text-[#6B6B6B]'

export function JobBoardFilters({ mode, categories, cityOptions, skillOptions, selected, onApplied }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()
  const lang = useLang()
  const groupId = useId()

  const [cat, setCat] = useState<string[]>(selected.categories)
  const [min, setMin] = useState(selected.minBudget != null ? String(selected.minBudget) : '')
  const [max, setMax] = useState(selected.maxBudget != null ? String(selected.maxBudget) : '')
  const [cities, setCities] = useState<string[]>(selected.cities)
  const [skills, setSkills] = useState<string[]>(selected.skills)
  const [postedWithin, setPostedWithin] = useState<string>(
    selected.postedWithin != null ? String(selected.postedWithin) : '',
  )

  // Each inline group collapses independently; all closed by default and reset on route change.
  const [catOpen, setCatOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [postedOpen, setPostedOpen] = useState(false)
  useEffect(() => {
    setCatOpen(false)
    setBudgetOpen(false)
    setCityOpen(false)
    setSkillsOpen(false)
    setPostedOpen(false)
  }, [pathname])

  function push(patch: Partial<JobFilterSelection> & { min?: string; max?: string; posted?: string }) {
    const lo = (patch.min ?? min).trim()
    const hi = (patch.max ?? max).trim()
    const pw = patch.posted ?? postedWithin
    const qs = buildSearchQuery(
      sp,
      {
        categories: patch.categories ?? cat,
        minBudget: lo === '' ? null : lo,
        maxBudget: hi === '' ? null : hi,
        cities: patch.cities ?? cities,
        skills: patch.skills ?? skills,
        postedWithin: pw === '' ? null : pw,
      },
      { resetPage: true },
    )
    router.push(qs ? `${BASE}?${qs}` : BASE)
    onApplied?.()
  }

  // Toggle membership in a multi-select; inline mode applies immediately.
  function toggleIn(list: string[], setList: (v: string[]) => void, key: 'categories' | 'cities' | 'skills', value: string) {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    setList(next)
    if (mode === 'inline') push({ [key]: next } as Partial<JobFilterSelection>)
  }

  function selectPosted(value: string) {
    const next = postedWithin === value ? '' : value
    setPostedWithin(next)
    if (mode === 'inline') push({ posted: next })
  }

  function clearAll() {
    setCat([])
    setMin('')
    setMax('')
    setCities([])
    setSkills([])
    setPostedWithin('')
    if (mode === 'inline') router.push(BASE)
  }

  const hasActive =
    cat.length > 0 ||
    min.trim() !== '' ||
    max.trim() !== '' ||
    cities.length > 0 ||
    skills.length > 0 ||
    postedWithin !== ''

  // ── Group contents (identical in both modes) ──────────────────────────────────
  const categoryList = (
    <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
      {categories.map((c) => (
        <label key={c.slug} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]">
          <FilterControl type="checkbox" checked={cat.includes(c.slug)} onChange={() => toggleIn(cat, setCat, 'categories', c.slug)} />
          <span className="line-clamp-1">{lang === 'ar' ? c.name_ar : c.name_fr}</span>
        </label>
      ))}
    </div>
  )

  const budgetInputs = (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label htmlFor={`${groupId}-bmin`} className="sr-only">
          {t('emplois.filters.budget.min', lang)}
        </label>
        <input
          id={`${groupId}-bmin`}
          type="number"
          inputMode="numeric"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => mode === 'inline' && push({})}
          placeholder={t('emplois.filters.budget.min', lang)}
          className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING}`}
        />
      </div>
      <span aria-hidden="true" className="text-[#6B6B6B]">
        –
      </span>
      <div className="flex-1">
        <label htmlFor={`${groupId}-bmax`} className="sr-only">
          {t('emplois.filters.budget.max', lang)}
        </label>
        <input
          id={`${groupId}-bmax`}
          type="number"
          inputMode="numeric"
          min={0}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => mode === 'inline' && push({})}
          placeholder={t('emplois.filters.budget.max', lang)}
          className={`w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING}`}
        />
      </div>
    </div>
  )

  const cityList = (
    <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
      {cityOptions.map((c) => (
        <label key={c.value} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]">
          <FilterControl type="checkbox" checked={cities.includes(c.value)} onChange={() => toggleIn(cities, setCities, 'cities', c.value)} />
          <span className="line-clamp-1">{c.label}</span>
        </label>
      ))}
    </div>
  )

  const skillsList = (
    <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
      {skillOptions.map((s) => (
        <label key={s} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]">
          <FilterControl type="checkbox" checked={skills.includes(s)} onChange={() => toggleIn(skills, setSkills, 'skills', s)} />
          <span className="line-clamp-1">{s}</span>
        </label>
      ))}
    </div>
  )

  const postedOptions: { value: string; label: string }[] = [
    { value: '', label: t('emplois.filters.posted_within.all', lang) },
    { value: '1', label: t('emplois.filters.posted_within.day', lang) },
    { value: '7', label: t('emplois.filters.posted_within.week', lang) },
    { value: '30', label: t('emplois.filters.posted_within.month', lang) },
  ]
  const postedList = (
    <div className="space-y-0.5">
      {postedOptions.map((o) => (
        <label key={o.value || 'all'} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]">
          <FilterControl type="radio" name={`${groupId}-posted`} checked={postedWithin === o.value} onChange={() => selectPosted(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )

  const clearButton = hasActive && (
    <button
      type="button"
      onClick={clearAll}
      className={`block w-full rounded-full px-4 py-2 text-center text-[13px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline ${FOCUS_RING}`}
    >
      {t('emplois.filters.reset', lang)}
    </button>
  )

  const budgetActive = min.trim() !== '' || max.trim() !== ''
  const postedActive = postedWithin !== ''

  // ── Mobile sheet — always-open fieldsets, batched until "Appliquer". ───────────
  if (mode === 'sheet') {
    return (
      <div className="space-y-6">
        {categories.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={heading}>{t('emplois.filters.category', lang)}</legend>
            {categoryList}
          </fieldset>
        )}
        <fieldset className="space-y-2">
          <legend className={heading}>{t('emplois.filters.budget', lang)}</legend>
          {budgetInputs}
        </fieldset>
        {cityOptions.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={heading}>{t('emplois.filters.city', lang)}</legend>
            {cityList}
          </fieldset>
        )}
        {skillOptions.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={heading}>{t('emplois.filters.skills', lang)}</legend>
            {skillsList}
          </fieldset>
        )}
        <fieldset className="space-y-2">
          <legend className={heading}>{t('emplois.filters.posted_within', lang)}</legend>
          {postedList}
        </fieldset>

        <button
          type="button"
          onClick={() => push({})}
          className={`w-full rounded-full bg-brand-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`}
        >
          {t('search.filters.apply', lang)}
        </button>
        {clearButton}
      </div>
    )
  }

  // ── Desktop inline rail — collapsible groups. ─────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="divide-y divide-border-subtle">
        {categories.length > 0 && (
          <CollapsibleGroup
            label={t('emplois.filters.category', lang)}
            badge={cat.length > 0 ? String(cat.length) : null}
            open={catOpen}
            onToggle={() => setCatOpen((o) => !o)}
            panelId={`${groupId}-cat`}
            ariaShow="Afficher les catégories"
            ariaHide="Masquer les catégories"
          >
            {categoryList}
          </CollapsibleGroup>
        )}
        <CollapsibleGroup
          label={t('emplois.filters.budget', lang)}
          badge={budgetActive ? 'actif' : null}
          open={budgetOpen}
          onToggle={() => setBudgetOpen((o) => !o)}
          panelId={`${groupId}-budget`}
          ariaShow="Afficher le filtre de budget"
          ariaHide="Masquer le filtre de budget"
        >
          {budgetInputs}
        </CollapsibleGroup>
        {cityOptions.length > 0 && (
          <CollapsibleGroup
            label={t('emplois.filters.city', lang)}
            badge={cities.length > 0 ? String(cities.length) : null}
            open={cityOpen}
            onToggle={() => setCityOpen((o) => !o)}
            panelId={`${groupId}-city`}
            ariaShow="Afficher les villes"
            ariaHide="Masquer les villes"
          >
            {cityList}
          </CollapsibleGroup>
        )}
        {skillOptions.length > 0 && (
          <CollapsibleGroup
            label={t('emplois.filters.skills', lang)}
            badge={skills.length > 0 ? String(skills.length) : null}
            open={skillsOpen}
            onToggle={() => setSkillsOpen((o) => !o)}
            panelId={`${groupId}-skills`}
            ariaShow="Afficher les compétences"
            ariaHide="Masquer les compétences"
          >
            {skillsList}
          </CollapsibleGroup>
        )}
        <CollapsibleGroup
          label={t('emplois.filters.posted_within', lang)}
          badge={postedActive ? 'actif' : null}
          open={postedOpen}
          onToggle={() => setPostedOpen((o) => !o)}
          panelId={`${groupId}-posted`}
          ariaShow="Afficher le filtre de date"
          ariaHide="Masquer le filtre de date"
        >
          {postedList}
        </CollapsibleGroup>
      </div>

      {clearButton}
    </div>
  )
}
