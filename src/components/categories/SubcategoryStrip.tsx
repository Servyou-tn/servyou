import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { CARD_SHADOW, HOVER_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import type { Subcategory } from '@/lib/categories/category-data'

// A horizontal, scrollable strip of child-category cards rendered above the results grid.
// Renders NOTHING when the category has no children (the flat-taxonomy case — true for
// every category today until a nesting migration lands). No thumbnail data exists yet, so
// each card uses a soft gradient placeholder tile + the category's initial.
export function SubcategoryStrip({ items, lang }: { items: Subcategory[]; lang: Lang }) {
  if (items.length === 0) return null

  return (
    <section className="mb-6">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
        {t('category.subcategories.label', lang)}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((c) => {
          const name = lang === 'ar' ? c.name_ar : c.name_fr
          return (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className={`flex w-40 shrink-0 flex-col gap-2 rounded-2xl border border-border-subtle bg-white p-3 transition-all duration-200 ease-out ${CARD_SHADOW} ${HOVER_SHADOW} ${FOCUS_RING}`}
            >
              <div
                className="flex h-20 items-center justify-center rounded-xl bg-linear-to-br from-[#F4F4F4] to-[#E8E8E8]"
                aria-hidden="true"
              >
                <span className="text-2xl font-bold text-brand-accent">
                  {(name.trim()[0] ?? '?').toUpperCase()}
                </span>
              </div>
              <span className="line-clamp-1 text-sm font-medium text-[#0A0A0A]">{name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
