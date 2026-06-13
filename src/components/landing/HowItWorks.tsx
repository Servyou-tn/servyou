'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Manrope } from 'next/font/google'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { t, type Lang } from '@/lib/i18n'
import { BlurFade } from '@/components/magicui/blur-fade'

// Manrope for the title + card titles, scoped via --font-display (same pattern as
// the hero, so this section reads as a continuation).
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Three steps. The icon is a universal meta-step (Setup → Engage → Transact),
// the SAME across all 3 roles — only the copy + CTA swap.
const steps = [
  { number: '01', key: 'step1', icon: '/brand/icons/how-it-works/step-01-account.png' },
  { number: '02', key: 'step2', icon: '/brand/icons/how-it-works/step-02-dealing.png' },
  { number: '03', key: 'step3', icon: '/brand/icons/how-it-works/step-03-delivery-payment.png' },
] as const

// The three audiences the section switches between. 'client' is the default.
const roles = ['client', 'freelancer', 'boutique'] as const
type Role = (typeof roles)[number]
type StepKey = (typeof steps)[number]['key']

// CTA destinations per role + step. Routes are not translatable, so they live here
// (not in the locale files). Several intended routes don't exist yet — those fall
// back to "/" with a TODO so they get wired when the pages ship.
const ctaHref: Record<Role, Record<StepKey, string>> = {
  client: {
    step1: '/', // TODO: route doesn't exist yet, fallback to / (intended: signup — real route is /signup)
    step2: '/', // "Explorer Servyou" → homepage (intended destination)
    step3: '/', // TODO: route doesn't exist yet, fallback to / (intended: /securite)
  },
  freelancer: {
    step1: '/', // TODO: route doesn't exist yet, fallback to / (intended: /devenir-freelance — real entry is /signup?role=freelancer)
    step2: '/missions',
    step3: '/', // TODO: route doesn't exist yet, fallback to / (intended: /faq)
  },
  boutique: {
    step1: '/devenir-vendeur',
    step2: '/', // TODO: route doesn't exist yet, fallback to / (intended: /boutiques — closest real route is /recherche)
    step3: '/', // TODO: route doesn't exist yet, fallback to / (intended: /faq)
  },
}

const display = 'font-[family-name:var(--font-display)]'

// Inline ArrowRight (lucide's exact path) — the project deliberately avoids the
// lucide-react package; the hero card CTA uses this same inline glyph.
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

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

  // Per-card role-swap transition. Reduced motion → instant swap. `visible` is
  // index-aware so the three cards still stagger in by 50ms.
  const cardVariants: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, ease: 'easeOut', delay: i * 0.05 },
        }),
        exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } },
      }

  return (
    <section
      id="comment-ca-marche"
      className={`${manrope.variable} w-full bg-[var(--surface-base)] px-6 pt-12 pb-16 md:pt-16 md:pb-24`}
    >
      {/* Section title — navy on the white page, OUTSIDE the navy container so it
          reads as a sibling of the Categories title (same Manrope scale/weight/
          colour/letter-spacing). */}
      <BlurFade delay={0} {...fade} inView>
        <h2 className={`${display} mx-auto mb-8 max-w-[720px] text-balance text-center text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)] md:mb-12 md:text-[40px]`}>
          {t('landing.howItWorks.title', lang)}
        </h2>
      </BlurFade>

      {/* Navy rounded container — a dark "card" floating inside the white page
          (Linear / ClickUp pattern), now content-only: role toggle + cards. */}
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[var(--brand-primary)] px-6 pt-10 pb-12 md:px-12 md:pt-14 md:pb-20">
        {/* Gentle radial depth: a soft brand-accent glow at centre fading to navy. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.08),_transparent_70%)]"
        />
        {/* Subtle dot texture — the hero's pattern, inverted to --brand-sky at very
            low opacity for the dark context. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--brand-sky)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-[0.04]"
        />

        <div className="relative z-10">
          {/* Role toggle — Upwork-style outlined sliding pill, floating as a raised
              white element. No BlurFade wrapper so the layoutId projection stays accurate. */}
          <div className="mb-12 flex justify-center">
            <div
              role="tablist"
              aria-label={t('landing.howItWorks.tabsAriaLabel', lang)}
              className="isolate inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] p-1 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
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

          {/* Cards. The grid is the STABLE tabpanel (so aria-controls never dangles).
              Each column holds a static floating icon + a per-column AnimatePresence
              that fade-swaps the copy + CTA. The CTA sits at the card bottom. */}
          <BlurFade delay={0.2} {...fade} inView>
            <div
              id={`${tabsId}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-${activeRole}`}
              className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3"
            >
              {steps.map((step, i) => (
                <div key={step.number} className="relative">
                  {/* Floating circular icon — universal across roles, stays static on swap. */}
                  <div className="absolute left-1/2 top-0 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-base)] shadow-[0_8px_20px_rgba(15,23,42,0.10)]">
                    <Image
                      src={step.icon}
                      width={128}
                      height={128}
                      alt={t(`landing.howItWorks.icons.${step.key}.alt`, lang)}
                      className="h-16 w-16 select-none"
                      draggable={false}
                    />
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeRole}
                      className="h-full"
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <article className="flex h-full flex-col rounded-2xl bg-[var(--surface-base)] px-8 pb-8 pt-16 text-start shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.18)] motion-reduce:transition-none md:min-h-[420px]">
                        <h3 className={`${display} text-2xl font-bold text-[var(--text-primary)] md:text-[28px]`}>
                          {t(`landing.howItWorks.${activeRole}.${step.key}.title`, lang)}
                        </h3>

                        <p className="mt-2 max-w-[90%] text-[17px] font-semibold text-[var(--text-primary)]">
                          {t(`landing.howItWorks.${activeRole}.${step.key}.tagline`, lang)}
                        </p>

                        <p className="mt-4 text-[15px] font-normal leading-[1.6] text-[var(--text-muted)]">
                          {t(`landing.howItWorks.${activeRole}.${step.key}.body`, lang)}
                        </p>

                        {/* CTA — brand-accent pill, bottom-aligned (mt-auto), 24px min gap (pt-6). */}
                        <div className="mt-auto pt-6">
                          <Link
                            href={ctaHref[activeRole][step.key]}
                            className={`${display} group inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-white outline-none transition duration-200 ease-out hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--brand-accent-light)] focus-visible:ring-offset-2`}
                          >
                            <span>{t(`landing.howItWorks.${activeRole}.${step.key}.cta`, lang)}</span>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                                isRtl ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'
                              }`}
                            />
                          </Link>
                        </div>
                      </article>
                    </motion.div>
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
