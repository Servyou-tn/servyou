import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

export function FinalCTA({
  headline,
  subheadline,
  primaryCta,
  note,
}: {
  headline: string
  subheadline: string
  primaryCta: { label: string; href: string }
  note?: string
}) {
  return (
    <section className="card-premium outline-brand mb-8 rounded-3xl bg-brand-accent/5 p-8 text-center md:p-12">
      <h2 className="mb-3 text-3xl font-bold text-text-primary md:text-4xl">{headline}</h2>
      <p className="mx-auto mb-6 max-w-xl text-base text-text-muted">{subheadline}</p>
      <Link
        href={primaryCta.href}
        className={`inline-flex h-14 items-center gap-2 rounded-full bg-brand-accent px-8 text-base font-semibold text-white shadow-lg transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-xl ${FOCUS_RING}`}
      >
        {primaryCta.label}
        <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
      {note && <p className="mt-4 text-xs text-text-muted">{note}</p>}
    </section>
  )
}
