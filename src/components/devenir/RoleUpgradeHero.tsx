import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

type Cta = { label: string; href: string }

// Hero for the role-upgrade pages. Generic — content + icon passed as props so both
// /devenir-vendeur and /devenir-freelance reuse it. Headline is the page's single <h1>.
export function RoleUpgradeHero({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  icon,
}: {
  eyebrow: string
  headline: string
  subheadline: string
  primaryCta: Cta
  secondaryCta?: Cta
  icon: ReactNode
}) {
  return (
    <section className="card-premium outline-brand mb-12 rounded-3xl bg-white p-8 md:p-12">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <span className="mb-4 inline-block rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-accent">
            {eyebrow}
          </span>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-text-primary md:text-5xl">
            {headline}
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-text-muted">{subheadline}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={primaryCta.href}
              className={`inline-flex h-12 items-center gap-2 rounded-full bg-brand-accent px-6 font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-lg ${FOCUS_RING}`}
            >
              {primaryCta.label}
              <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className={`inline-flex h-12 items-center rounded-full border border-border-subtle bg-white px-6 font-medium text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>

        <div className="flex aspect-square items-center justify-center rounded-2xl bg-brand-accent/5 p-8">
          {icon}
        </div>
      </div>
    </section>
  )
}
