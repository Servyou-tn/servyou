import { type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import { Manrope } from 'next/font/google'
import { t, type Lang } from '@/lib/i18n'
import {
  ShirtIcon,
  SparklesIcon,
  SmartphoneIcon,
  SofaIcon,
  VideoIcon,
  PaletteIcon,
  MegaphoneIcon,
  CodeIcon,
  MicIcon,
  ArrowUpRightIcon,
} from './icons'

// Manrope, scoped via --font-display (same pattern as the hero / HowItWorks, so
// the three sections read as one continuous voice). No 'use client': this section
// is pure presentation — hover lift, focus ring and reduced-motion are all CSS,
// and <Link> + next/font work server-side. Keeping it server-rendered serves the
// "lightweight, fast load" intent (no JS shipped for this section).
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const display = 'font-[family-name:var(--font-display)]'

// Nine modern-marketplace categories — 4 e-commerce, 4 creator/service, 1 IT.
// Icons are inline SVGs (the project deliberately avoids the lucide-react package
// — see icons.tsx); the geometry is lucide's exact path data. `slug` is the future
// listing filter value (feeds the href below once /boutiques ships).
type Category = {
  id: string
  slug: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const CATEGORIES: Category[] = [
  { id: 'mode', slug: 'mode-style', Icon: ShirtIcon },
  { id: 'beaute', slug: 'beaute-cosmetiques', Icon: SparklesIcon },
  { id: 'tech', slug: 'electronique-tech', Icon: SmartphoneIcon },
  { id: 'maison', slug: 'maison-lifestyle', Icon: SofaIcon },
  { id: 'video', slug: 'video-ugc', Icon: VideoIcon },
  { id: 'design', slug: 'design-graphisme', Icon: PaletteIcon },
  { id: 'marketing', slug: 'marketing-social-media', Icon: MegaphoneIcon },
  { id: 'dev', slug: 'developpement-ia', Icon: CodeIcon },
  { id: 'audio', slug: 'voix-off-audio', Icon: MicIcon },
]

// Shared card chrome. The lift is gated on motion-safe so it is fully suppressed
// under prefers-reduced-motion (border/shadow still snap instantly); the rest of
// the transitions collapse via motion-reduce:transition-none.
const cardBase =
  `${display} group relative flex h-full min-h-[140px] flex-col justify-between rounded-3xl p-5 outline-none ` +
  'transition-all duration-[250ms] ease-out motion-safe:hover:-translate-y-1 ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 ' +
  'motion-reduce:transition-none md:min-h-[160px] md:p-7'

const cardLabel =
  'mt-auto text-base font-semibold leading-[1.3] tracking-[-0.01em] md:text-lg'

export function Categories({ lang }: { lang: Lang }) {
  const headingId = 'categories-heading'
  const isRtl = lang === 'ar'

  return (
    // White ground (matches the hero) — visual continuity before the navy
    // HowItWorks section. The grid mirrors automatically under <html dir="rtl">.
    <section
      aria-labelledby={headingId}
      className={`${manrope.variable} mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24`}
    >
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-16">
        <h2
          id={headingId}
          className={`${display} text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl`}
        >
          {t('landing.categories.title', lang)}
        </h2>
        <p className={`${display} mt-3 text-base font-medium text-[var(--text-muted)] md:text-lg`}>
          {t('landing.categories.subtitle', lang)}
        </p>
      </div>

      {/* 2 cols mobile · 3 tablet · 5 desktop → 9 cards + the navy "Voir tout" 10th */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {CATEGORIES.map(({ id, Icon }) => (
          <li key={id}>
            <Link
              // TODO: intended /boutiques?category=<slug> — listing route not built
              // yet (no /boutiques in the app), so fall back to "/" until it ships.
              href="/"
              className={`${cardBase} border border-[var(--border-subtle)] bg-[var(--surface-base)] hover:border-[var(--brand-accent)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]`}
            >
              <Icon
                aria-hidden="true"
                className="h-8 w-8 text-[var(--brand-accent)] transition-colors duration-[250ms] ease-out group-hover:text-[var(--brand-primary)] motion-reduce:transition-none md:h-9 md:w-9"
              />
              <span className={`${cardLabel} text-[var(--text-primary)]`}>
                {t(`landing.categories.items.${id}`, lang)}
              </span>
            </Link>
          </li>
        ))}

        {/* 10th card — "Voir tout", navy fill, white icon + label */}
        <li>
          <Link
            // TODO: intended /boutiques (all categories) — listing route not built yet.
            href="/"
            className={`${cardBase} border border-[var(--brand-primary)] bg-[var(--brand-primary)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.20)]`}
          >
            <ArrowUpRightIcon
              aria-hidden="true"
              className={`h-8 w-8 text-white md:h-9 md:w-9 ${isRtl ? 'scale-x-[-1]' : ''}`}
            />
            <span className={`${cardLabel} text-white`}>
              {t('landing.categories.viewAll', lang)}
            </span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
