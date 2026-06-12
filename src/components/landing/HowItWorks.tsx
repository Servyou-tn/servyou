'use client'

import { Manrope } from 'next/font/google'
import { useReducedMotion } from 'motion/react'
import { t, type Lang } from '@/lib/i18n'
import { BlurFade } from '@/components/magicui/blur-fade'

// Manrope for the headline + card numerals/titles, scoped via --font-display (same
// pattern as the hero, so this section reads as a continuation).
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Three typographic steps — the step NUMBER is the visual anchor (no icons).
const steps = [
  { number: '01', key: 'step1' },
  { number: '02', key: 'step2' },
  { number: '03', key: 'step3' },
] as const

const display = 'font-[family-name:var(--font-display)]'

export function HowItWorks({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion()
  // Under reduced motion BlurFade collapses to a plain opacity fade (no slide/blur).
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  return (
    <section
      id="comment-ca-marche"
      className={`${manrope.variable} relative w-full overflow-hidden bg-white py-16 md:py-24`}
    >
      {/* Subtle dot pattern (kept — matches the hero's identity). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--brand-sky)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-30"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <BlurFade delay={0} {...fade} inView>
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-[var(--brand-accent)]">
              {t('landing.howItWorks.eyebrow', lang)}
            </span>
            <h2 className={`${display} mb-6 text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-5xl lg:text-6xl`}>
              {t('landing.howItWorks.headline', lang)}
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">
              {t('landing.howItWorks.subtitle', lang)}
            </p>
          </div>
        </BlurFade>

        {/* Three typographic cards (1 col mobile, 3 cols tablet+). */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <BlurFade key={step.number} className="h-full" delay={0.2 + index * 0.15} {...fade} inView>
              <article className="flex h-full flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-8 text-start shadow-sm transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none md:min-h-[380px]">
                {/* Top strip: ÉTAPE label + big number */}
                <div className="flex items-start justify-between">
                  <span className={`${display} text-xs font-semibold uppercase tracking-widest text-[var(--brand-accent)]`}>
                    {t('landing.howItWorks.stepLabel', lang)}
                  </span>
                  <span className={`${display} text-[64px] font-bold leading-none text-[var(--brand-accent-light)]`}>
                    {step.number}
                  </span>
                </div>

                <h3 className={`${display} mt-8 text-2xl font-bold text-[var(--text-primary)] md:text-[28px]`}>
                  {t(`landing.howItWorks.${step.key}.title`, lang)}
                </h3>

                <p className="mt-2 max-w-[90%] text-[17px] font-semibold text-[var(--text-primary)]">
                  {t(`landing.howItWorks.${step.key}.tagline`, lang)}
                </p>

                <p className="mt-4 text-[15px] font-normal leading-[1.6] text-[var(--text-muted)]">
                  {t(`landing.howItWorks.${step.key}.body`, lang)}
                </p>
              </article>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
