import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// Shown when the user already has the role (seller_type matches). Takes resolved strings
// (the page supplies the correct noun per role — "boutique" / "profil freelance").
export function AlreadyHaveRole({
  headline,
  subheadline,
  manageHref,
  manageLabel,
}: {
  headline: string
  subheadline: string
  manageHref: string
  manageLabel: string
}) {
  return (
    <section className="card-premium outline-brand rounded-3xl bg-white p-8 text-center md:p-12">
      <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" aria-hidden="true" />
      <h1 className="mb-3 text-2xl font-bold text-text-primary">{headline}</h1>
      <p className="mx-auto mb-6 max-w-xl text-base text-text-muted">{subheadline}</p>
      <Link
        href={manageHref}
        className={`inline-flex h-12 items-center rounded-full bg-brand-blue-600 px-6 font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-blue-500 hover:shadow-lg ${FOCUS_RING}`}
      >
        {manageLabel}
      </Link>
    </section>
  )
}
