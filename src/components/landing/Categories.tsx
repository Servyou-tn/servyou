import Link from 'next/link'
import { ChevronRight, Code, House, Megaphone, Palette, Shirt, Smartphone, Sparkles, Video, type LucideIcon } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Eyebrow, TITLE, LEAD } from './ui'

// Section 1 · Catégories (#categories) — Figma 1693:48340. 8 real DB categories (4 services, 4 products),
// no counts. Desktop: centred head, 2 rows of 4 cards (282 wide, 24 gap, r16, p24). Phone: left-aligned
// head, 2×2 grids (166 wide, 12 gap, r14, p16).
const ROWS: { slug: string; key: string; icon: LucideIcon }[][] = [
  [
    { slug: 'developpement-web-mobile', key: 'dev', icon: Code },
    { slug: 'design-graphique-logo', key: 'design', icon: Palette },
    { slug: 'montage-video-motion', key: 'video', icon: Video },
    { slug: 'community-management', key: 'cm', icon: Megaphone },
  ],
  [
    { slug: 'mode', key: 'mode', icon: Shirt },
    { slug: 'electronique', key: 'tech', icon: Smartphone },
    { slug: 'beaute-soins', key: 'beauty', icon: Sparkles },
    { slug: 'maison', key: 'home', icon: House },
  ],
]

export function Categories({ lang }: { lang: Lang }) {
  return (
    <section id="categories" className="mx-4 mt-8 scroll-mt-20 lg:mx-auto lg:mt-16 lg:max-w-[1200px] lg:px-0 max-xl:lg:mx-6">
      <div className="flex flex-col gap-2 lg:mx-auto lg:max-w-[860px] lg:items-center lg:gap-3 lg:text-center">
        <Eyebrow className="text-brand-blue-600">{t('lp.cat.eyebrow', lang)}</Eyebrow>
        <h2 className={cn(TITLE, 'text-text-primary')}>{t('lp.cat.title', lang)}</h2>
        <p className={cn(LEAD, 'text-text-secondary lg:max-w-[600px]')}>{t('lp.cat.subtitle', lang)}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:mt-10 lg:gap-6">
        {ROWS.map((row, r) => (
          <ul key={r} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {row.map(({ slug, key, icon: Icon }) => (
              <li key={slug}>
                <Link
                  href={`/categories/${slug}`}
                  className={cn(
                    'group flex h-full flex-col gap-3 rounded-[14px] border border-border-subtle bg-surface-base p-4 transition-colors hover:border-brand-blue-200 lg:gap-4 lg:rounded-2xl lg:p-6',
                    r === 0 ? 'min-h-[193px] lg:min-h-[214px]' : 'min-h-[167px] lg:min-h-[188px]',
                    FOCUS_RING,
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-[10px] bg-brand-blue-50 text-brand-blue-600 lg:size-12 lg:rounded-xl">
                      <Icon className="size-5 lg:size-6" aria-hidden="true" />
                    </span>
                    <ChevronRight className="hidden size-5 text-text-muted lg:block rtl:rotate-180" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-1 lg:gap-1.5">
                    <span className="text-base leading-[26px] font-semibold text-text-primary lg:text-xl lg:leading-[26px] lg:tracking-[-0.01em] rtl:tracking-normal">
                      {t(`lp.cat.${key}.name`, lang)}
                    </span>
                    <span className="text-xs leading-[17px] text-text-secondary lg:text-sm lg:leading-[21px]">{t(`lp.cat.${key}.desc`, lang)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>

      <div className="mt-6 flex justify-center lg:mt-10">
        <Link
          href="/marche/services"
          className={cn('inline-flex h-10 items-center rounded-[10px] px-4 text-base font-semibold text-brand-blue-600 hover:underline', FOCUS_RING)}
        >
          {t('lp.cat.all', lang)}
        </Link>
      </div>
    </section>
  )
}
