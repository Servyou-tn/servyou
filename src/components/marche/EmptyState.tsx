import Link from 'next/link'
import type { ReactNode } from 'react'
import { CARD_SHADOW } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Shared empty-state card for the account pages: a muted 48px glyph, a message, an optional
// subtitle line, and an optional CTA. A disabled CTA renders as a muted non-link (used where
// the destination route isn't built yet).
export function EmptyState({
  icon,
  message,
  subtitle,
  cta,
}: {
  icon: ReactNode
  message: string
  // Additive, optional second line (F1 /mes-favoris — the reused message-only shape used by
  // /mes-annonces is unaffected since it never passes this).
  subtitle?: string
  cta?: { label: string; href: string; disabled?: boolean }
}) {
  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <div className="mx-auto text-text-muted" aria-hidden="true">
          {icon}
        </div>
        <p className="mt-4 text-base font-semibold text-text-primary">{message}</p>
        {subtitle && <p className="mt-2 text-body-sm text-text-muted">{subtitle}</p>}
        {cta &&
          (cta.disabled ? (
            <span className="mt-6 inline-flex cursor-not-allowed select-none items-center rounded-full bg-brand-blue-600/40 px-5 py-2.5 text-sm font-medium text-white opacity-70">
              {cta.label}
            </span>
          ) : (
            <Link
              href={cta.href}
              className={cn('mt-6', BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.primary, VARIANT_STATE.primary)}
            >
              {cta.label}
            </Link>
          ))}
      </div>
    </div>
  )
}
