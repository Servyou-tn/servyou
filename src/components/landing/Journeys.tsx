import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ArrowRightIcon } from './icons'

// Section 5 — three role journeys, alternating text/visual sides per the
// template: Acheteurs (visual right) · Boutiques (visual left) · Freelances
// (visual right). The Boutiques and Freelances rows carry the #boutiques /
// #freelances anchors the public navbar links scroll to. Visuals are wordless
// skeleton dashboards (no illustrated assets yet — deferred per the template).
type Journey = {
  id?: string
  reversed: boolean
  labelKey: string
  headlineKey: string
  bodyKey: string
  ctaKey: string
  href: string
  accent: string
}

const journeys: Journey[] = [
  {
    reversed: false,
    labelKey: 'landing.journey.buyers_label',
    headlineKey: 'landing.journey.buyers_headline',
    bodyKey: 'landing.journey.buyers_body',
    ctaKey: 'landing.journey.buyers_cta',
    href: '/',
    accent: 'bg-brand-accent',
  },
  {
    id: 'boutiques',
    reversed: true,
    labelKey: 'landing.journey.shops_label',
    headlineKey: 'landing.journey.shops_headline',
    bodyKey: 'landing.journey.shops_body',
    ctaKey: 'landing.journey.shops_cta',
    href: '/inscription',
    accent: 'bg-brand-primary',
  },
  {
    id: 'freelances',
    reversed: false,
    labelKey: 'landing.journey.freelancers_label',
    headlineKey: 'landing.journey.freelancers_headline',
    bodyKey: 'landing.journey.freelancers_body',
    ctaKey: 'landing.journey.freelancers_cta',
    href: '/inscription',
    accent: 'bg-status-dot-success',
  },
]

// Wordless skeleton dashboard: a titled panel over three content rows, each with
// an avatar block, two text bars, and a status dot in the journey's accent.
function MockDashboard({ accent }: { accent: string }) {
  return (
    <div className="w-full rounded-2xl border border-border-subtle bg-white p-4 shadow-md" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="h-2.5 w-24 rounded-full bg-slate-200" />
        <span className="ml-auto h-2.5 w-10 rounded-full bg-slate-200" />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-2/3 rounded-full bg-slate-300" />
              <div className="h-2.5 w-2/5 rounded-full bg-slate-200" />
            </div>
            <span className={`h-6 w-16 rounded-full ${accent} opacity-20`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Journeys({ lang }: { lang: Lang }) {
  return (
    <section className="bg-surface-subtle">
      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-24">
        {journeys.map(j => (
          <div
            key={j.labelKey}
            id={j.id}
            className="grid items-center gap-12 lg:grid-cols-2 lg:scroll-mt-28"
          >
            {/* Text */}
            <div className={j.reversed ? 'lg:order-2' : 'lg:order-1'}>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-accent">
                {t(j.labelKey, lang)}
              </p>
              <h3 className="mt-3 max-w-[440px] text-3xl font-bold leading-tight tracking-tight text-text-primary">
                {t(j.headlineKey, lang)}
              </h3>
              <p className="mt-4 max-w-[480px] text-base leading-relaxed text-text-muted">
                {t(j.bodyKey, lang)}
              </p>
              <Link
                href={j.href}
                className={`mt-6 inline-flex items-center gap-2 rounded-md text-base font-semibold text-brand-accent transition-colors hover:text-brand-primary ${FOCUS_RING}`}
              >
                {t(j.ctaKey, lang)}
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>

            {/* Visual */}
            <div className={`flex justify-center ${j.reversed ? 'lg:order-1' : 'lg:order-2'}`}>
              <div className="w-full max-w-[420px]">
                <MockDashboard accent={j.accent} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
