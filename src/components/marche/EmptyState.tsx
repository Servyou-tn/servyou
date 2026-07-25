import Link from 'next/link'
import type { ReactNode } from 'react'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'

// Shared empty-state card for the account pages: a muted 48px glyph, a message, and an
// optional CTA. A disabled CTA renders as a muted non-link (used where the destination
// route isn't built yet).
export function EmptyState({
  icon,
  message,
  cta,
}: {
  icon: ReactNode
  message: string
  cta?: { label: string; href: string; disabled?: boolean }
}) {
  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <div className="mx-auto text-text-muted" aria-hidden="true">
          {icon}
        </div>
        <p className="mt-4 text-base font-semibold text-text-primary">{message}</p>
        {cta &&
          (cta.disabled ? (
            <span className="mt-6 inline-flex cursor-not-allowed select-none items-center rounded-full bg-brand-blue-600/40 px-5 py-2.5 text-sm font-medium text-white opacity-70">
              {cta.label}
            </span>
          ) : (
            <Link
              href={cta.href}
              className={`mt-6 inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 ${FOCUS_RING}`}
            >
              {cta.label}
            </Link>
          ))}
      </div>
    </div>
  )
}
