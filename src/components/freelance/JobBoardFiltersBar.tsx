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

// The job board's horizontal filter bar (Indeed / LinkedIn pattern): a row of dropdown "chips",
// each opening a Radix Popover with its filter UI and an "Appliquer" button. Replaces the old
// left-rail JobBoardFilters + bottom-sheet so the page can render inside FreelancerLayout's
// sidebar+content shell without a competing filter column. The bar scrolls horizontally on small
// screens (Popover content is portalled, so it isn't clipped by the scroll container). Each
// "Appliquer" patches only ITS own URL keys (buildSearchQuery merges the rest) and closes the
// popover — applying on every checkbox would fight the route change. Same URL params + data layer
// as before (no job-board-data.ts change).

export type CityOption = { value: string; label: string }

export type JobFilterSelection = {
  categories: string[] // category slugs
  minBudget: number | null
  maxBudget: number | null
  cities: string[] // governorate canonical values
  skills: string[]
  postedWithin: number | null // 1 | 7 | 30 | null
}

type Props = {
  categories: FilterCategory[]
  cityOptions: CityOption[]
  skillOptions: string[]
  selected: JobFilterSelection
}

const BASE = '/emplois'

const chipBase =
  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors'

const applyBtn =
  'w-full rounded-full bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90'

const inputCls =
  'w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted'

// One filter chip — a popover trigger that shows the label + active count, and portalled content.
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

// A multi-select checkbox body (category / ville / compétences) — drafts locally, applies its key.
function MultiSelectBody({
  options,
  selected,
  paramKey,
  close,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  paramKey: 'categories' | 'cities' | 'skills'
  close: () => void
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [draft, setDraft] = useState<string[]>(selected)

  const toggle = (v: string) =>
    setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]))

  const apply = () => {
    const qs = buildSearchQuery(sp, { [paramKey]: draft }, { resetPage: true })
    close()
    router.push(qs ? `${BASE}?${qs}` : BASE)
  }

  return (
    <div className="space-y-3">
      <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-text-primary"
          >
            <FilterControl type="checkbox" checked={draft.includes(o.value)} onChange={() => toggle(o.value)} />
            <span className="line-clamp-1">{o.label}</span>
          </label>
        ))}
      </div>
      <button type="button" onClick={apply} className={cn(applyBtn, FOCUS_RING)}>
        {t('search.filters.apply', lang)}
      </button>
    </div>
  )
}

// Budget min/max body.
function BudgetBody({
  minBudget,
  maxBudget,
  close,
}: {
  minBudget: number | null
  maxBudget: number | null
  close: () => void
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [min, setMin] = useState(minBudget != null ? String(minBudget) : '')
  const [max, setMax] = useState(maxBudget != null ? String(maxBudget) : '')

  const apply = () => {
    const qs = buildSearchQuery(
      sp,
      { minBudget: min.trim() === '' ? null : min.trim(), maxBudget: max.trim() === '' ? null : max.trim() },
      { resetPage: true },
    )
    close()
    router.push(qs ? `${BASE}?${qs}` : BASE)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="job-budget-min" className="sr-only">
            {t('emplois.filters.budget.min', lang)}
          </label>
          <input
            id="job-budget-min"
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={t('emplois.filters.budget.min', lang)}
            className={cn(inputCls, FOCUS_RING)}
          />
        </div>
        <span aria-hidden="true" className="text-text-muted">
          –
        </span>
        <div className="flex-1">
          <label htmlFor="job-budget-max" className="sr-only">
            {t('emplois.filters.budget.max', lang)}
          </label>
          <input
            id="job-budget-max"
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={t('emplois.filters.budget.max', lang)}
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

// "Posté il y a" radio body.
function PostedBody({ value, close }: { value: number | null; close: () => void }) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [val, setVal] = useState(value != null ? String(value) : '')

  const options: { value: string; label: string }[] = [
    { value: '', label: t('emplois.filters.posted_within.all', lang) },
    { value: '1', label: t('emplois.filters.posted_within.day', lang) },
    { value: '7', label: t('emplois.filters.posted_within.week', lang) },
    { value: '30', label: t('emplois.filters.posted_within.month', lang) },
  ]

  const apply = () => {
    const qs = buildSearchQuery(sp, { postedWithin: val === '' ? null : val }, { resetPage: true })
    close()
    router.push(qs ? `${BASE}?${qs}` : BASE)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        {options.map((o) => (
          <label
            key={o.value || 'all'}
            className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-text-primary"
          >
            <FilterControl type="radio" name="job-posted-within" checked={val === o.value} onChange={() => setVal(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <button type="button" onClick={apply} className={cn(applyBtn, FOCUS_RING)}>
        {t('search.filters.apply', lang)}
      </button>
    </div>
  )
}

export function JobBoardFiltersBar({ categories, cityOptions, skillOptions, selected }: Props) {
  const router = useRouter()
  const lang = useLang()

  const hasActive =
    selected.categories.length > 0 ||
    selected.minBudget != null ||
    selected.maxBudget != null ||
    selected.cities.length > 0 ||
    selected.skills.length > 0 ||
    selected.postedWithin != null

  const catOptions = categories.map((c) => ({
    value: c.slug,
    label: lang === 'ar' ? c.name_ar : c.name_fr,
  }))
  const budgetCount = selected.minBudget != null || selected.maxBudget != null ? 1 : 0
  const postedCount = selected.postedWithin != null ? 1 : 0

  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
      {catOptions.length > 0 && (
        <FilterChip label={t('emplois.filters.category', lang)} count={selected.categories.length}>
          {(close) => (
            <MultiSelectBody options={catOptions} selected={selected.categories} paramKey="categories" close={close} />
          )}
        </FilterChip>
      )}

      <FilterChip label={t('emplois.filters.budget', lang)} count={budgetCount}>
        {(close) => <BudgetBody minBudget={selected.minBudget} maxBudget={selected.maxBudget} close={close} />}
      </FilterChip>

      <FilterChip label={t('emplois.filters.city', lang)} count={selected.cities.length}>
        {(close) => <MultiSelectBody options={cityOptions} selected={selected.cities} paramKey="cities" close={close} />}
      </FilterChip>

      {skillOptions.length > 0 && (
        <FilterChip label={t('emplois.filters.skills', lang)} count={selected.skills.length}>
          {(close) => (
            <MultiSelectBody
              options={skillOptions.map((s) => ({ value: s, label: s }))}
              selected={selected.skills}
              paramKey="skills"
              close={close}
            />
          )}
        </FilterChip>
      )}

      <FilterChip label={t('emplois.filters.posted_within', lang)} count={postedCount}>
        {(close) => <PostedBody value={selected.postedWithin} close={close} />}
      </FilterChip>

      {hasActive && (
        <button
          type="button"
          onClick={() => router.push(BASE)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-primary hover:underline',
            FOCUS_RING,
          )}
        >
          {t('emplois.filters.reset', lang)}
        </button>
      )}
    </div>
  )
}
