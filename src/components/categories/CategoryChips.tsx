import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

export type CategoryChip = { slug: string; name_fr: string; name_ar: string }

// C2 sub-category chips — Figma 1486:24359 / 1488:66061 (docs/design/category-c2-measurements.md). One wrapping row of pills, gap 8: « Tout »
// (the parent sector) first, then the children in the locked taxonomy's order; the page's own entry is the filled blue/600 pill, the others are outlined `border-subtle`. Pad 6/14,
// body-sm Medium, fully round. Each chip is a real link to that category's page and carries the active q / ville / prix / tri along.
// Below `sm` the row scrolls sideways on ONE line instead of wrapping: the 375 frame wraps ten chips into a clipped block (« Bar », « Car… »), and a
// wrapped block would push the first card a full screen down (D7).
// Plain class strings next to the text-size token (twMerge footgun). The ::before widens the hit area to 44 px without moving the 35 px pill.
const CHIP =
  'relative inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-body-sm font-medium before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[""]'

export function CategoryChips({
  allHref,
  chips,
  activeSlug,
  carry,
  lang,
}: {
  /** The « Tout » chip: the sector page (or, on a sector, the sector itself). */
  allHref: string
  chips: CategoryChip[]
  /** The slug of the page being shown; null = « Tout » is the active chip. */
  activeSlug: string | null
  /** The query string the chips carry along (q / ville / prix / tri, never page or categorie). */
  carry: string
  lang: Lang
}) {
  if (chips.length === 0) return null
  const withCarry = (path: string) => (carry ? `${path}?${carry}` : path)

  return (
    <nav aria-label={t('category.subcategories.label', lang)}>
      <ul className="flex flex-wrap gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1">
        <li className="shrink-0">
          <Link
            href={withCarry(allHref)}
            aria-current={activeSlug === null ? 'page' : undefined}
            className={`${CHIP} ${
              activeSlug === null
                ? 'bg-brand-blue-600 text-text-inverse'
                : 'border border-border-subtle bg-surface-base text-text-secondary hover:bg-surface-subtle'
            } ${FOCUS_RING}`}
          >
            {t('category.chips.all', lang)}
          </Link>
        </li>
        {chips.map((c) => {
          const active = c.slug === activeSlug
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={withCarry(`/categories/${c.slug}`)}
                aria-current={active ? 'page' : undefined}
                className={`${CHIP} ${
                  active
                    ? 'bg-brand-blue-600 text-text-inverse'
                    : 'border border-border-subtle bg-surface-base text-text-secondary hover:bg-surface-subtle'
                } ${FOCUS_RING}`}
              >
                {lang === 'ar' ? c.name_ar : c.name_fr}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
