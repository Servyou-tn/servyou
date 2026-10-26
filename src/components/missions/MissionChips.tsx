import { CATEGORY_ICONS } from '@/components/shared/service-category-icons'
import { Wrench } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// The three chips shared by the H9 card and the H10 header / facts (docs/design/h9-h13-measurements.md §1.2, §2.1).
// Server components; plain class strings (see CompetitionPill on why not cn()).

/** Category chip: blue/50, radius md, px 12 / py 4, 14 px icon + Medium 14 blue/700. */
export function CategoryChip({ slug, nameFr, nameAr, lang }: { slug: string | null; nameFr: string | null; nameAr: string | null; lang: Lang }) {
  const name = lang === 'ar' ? (nameAr ?? nameFr) : nameFr
  if (!name) return null
  const Icon = (slug && CATEGORY_ICONS[slug]) || Wrench
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-brand-blue-50 px-3 py-1 text-body-sm font-medium text-brand-blue-700">
      <Icon className="size-3.5 shrink-0 text-brand-blue-600" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  )
}

/** « Nouveau »: the active-filter pill without its ✕ (D-H9-6: published < 48 h ago). */
export function NewChip({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-brand-blue-50 px-3 py-1 text-body-sm font-medium text-brand-blue-600">
      {t('missioncard.new', lang)}
    </span>
  )
}

/** Grey skill chip (surface/sunken) — deliberately not blue, to contrast with the category chip. */
export function SkillChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
      <span className="truncate">{children}</span>
    </span>
  )
}
