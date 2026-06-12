'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Manrope } from 'next/font/google'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { t, type Lang } from '@/lib/i18n'
import { BlurFade } from '@/components/magicui/blur-fade'

// Manrope for the title + card numerals/titles, scoped via --font-display (same
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

// The three audiences the section switches between. 'client' is the default.
const roles = ['client', 'freelancer', 'boutique'] as const
type Role = (typeof roles)[number]

const display = 'font-[family-name:var(--font-display)]'

export function HowItWorks({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion()
  // Under reduced motion BlurFade collapses to a plain opacity fade (no slide/blur).
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  const [activeRole, setActiveRole] = useState<Role>('client')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const tabsId = useId()
  const isRtl = lang === 'ar'

  // Manual-activation tablist (WAI-ARIA tabs pattern): arrow keys move focus,
  // Enter/Space activates the focused tab. Arrow direction follows reading order
  // and mirrors under RTL.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = roles.length - 1
    let next: number
    switch (e.key) {
      case 'ArrowRight':
        next = isRtl ? index - 1 : index + 1
        break
      case 'ArrowLeft':
        next = isRtl ? index + 1 : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        setActiveRole(roles[index])
        return
      default:
        return
    }
    e.preventDefault()
    const wrapped = next < 0 ? last : next > last ? 0 : next
    tabRefs.current[wrapped]?.focus()
  }

  // Role-swap transition. Reduced motion → instant swap (no fade, no slide).
  const cardVariants: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
        exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } },
      }
  // Stagger the cards in by 50ms; exit them together.
  const gridVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
    exit: { transition: { staggerChildren: 0 } },
  }

  return (
    <section
      id="comment-ca-marche"
      className={`${manrope.variable} relative w-full overflow-hidden bg-white pt-12 pb-16 md:pt-16 md:pb-24`}
    >
      {/* Subtle dot pattern (kept — matches the hero's identity). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--brand-sky)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-30"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Section title (promoted from the old eyebrow; headline + subtitle removed). */}
        <BlurFade delay={0} {...fade} inView>
          <h2 className={`${display} mb-8 text-center text-2xl font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[32px]`}>
            {t('landing.howItWorks.title', lang)}
          </h2>
        </BlurFade>

        {/* Role toggle — Upwork-style outlined sliding pill. The indicator uses a
            shared layoutId, so framer-motion glides it between buttons with spring
            physics. Rendered without a transform-ancestor (no BlurFade wrapper) so
            the layout projection stays accurate. */}
        <div className="mb-12 flex justify-center">
          <div
            role="tablist"
            aria-label={t('landing.howItWorks.tabsAriaLabel', lang)}
            className="isolate inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] p-1"
          >
            {roles.map((role, index) => {
              const selected = activeRole === role
              return (
                <button
                  key={role}
                  ref={(el) => {
                    tabRefs.current[index] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${tabsId}-tab-${role}`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveRole(role)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                  className={`${display} relative cursor-pointer rounded-full px-7 py-2.5 text-[15px] outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ${
                    selected
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="roleToggleIndicator"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-full border-[1.5px] border-[var(--brand-primary)] bg-transparent"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 400, damping: 30 }
                      }
                    />
                  )}
                  <span className="relative z-10">{t(`landing.howItWorks.tabs.${role}`, lang)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Three typographic cards, driven by activeRole (1 col mobile, 3 cols tablet+).
            AnimatePresence (mode="wait", keyed by role) handles the fade-swap; the
            animated wrapper div keeps the card's own hover transform intact. */}
        <BlurFade delay={0.2} {...fade} inView>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeRole}
              id={`${tabsId}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-${activeRole}`}
              className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3"
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {steps.map((step) => (
                <motion.div key={step.number} className="h-full" variants={cardVariants}>
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
                      {t(`landing.howItWorks.${activeRole}.${step.key}.title`, lang)}
                    </h3>

                    <p className="mt-2 max-w-[90%] text-[17px] font-semibold text-[var(--text-primary)]">
                      {t(`landing.howItWorks.${activeRole}.${step.key}.tagline`, lang)}
                    </p>

                    <p className="mt-4 text-[15px] font-normal leading-[1.6] text-[var(--text-muted)]">
                      {t(`landing.howItWorks.${activeRole}.${step.key}.body`, lang)}
                    </p>
                  </article>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </BlurFade>
      </div>
    </section>
  )
}
