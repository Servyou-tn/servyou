'use client'

import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

export type CategoryPill = { name_fr: string; slug: string }

// Right-rail card 3. Top-level categories as discovery pills. The whole card is
// hidden upstream (right rail) when there are no categories, so no empty state here.
export function CategoriesWidget({ categories }: { categories: CategoryPill[] }) {
  const lang = useLang()

  return (
    <BlurFade delay={0.2} inView>
      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('dashboard.rightRail.categories.heading', lang)}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorie/${c.slug}`}
              className={`rounded-full bg-surface-pill px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-pill-active ${FOCUS_RING}`}
            >
              {c.name_fr}
            </Link>
          ))}
        </div>
      </div>
    </BlurFade>
  )
}
