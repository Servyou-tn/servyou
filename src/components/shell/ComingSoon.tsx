import type { ReactNode } from 'react'
import { CARD_SHADOW } from '@/components/layout/styles'

// Shared "Bientôt disponible" placeholder card for routes whose real surface ships in a later PR
// (freelance workspace, statistics, dashboard). Honest about being unbuilt — no fake data
// (phase-aware-features). Title + description are i18n strings supplied by the page.
export function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className={`mx-auto mt-4 max-w-md rounded-card bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto mb-4 inline-flex text-text-muted" aria-hidden="true">
        {icon}
      </div>
      <h1 className="text-h3 text-text-primary">{title}</h1>
      <p className="mt-2 text-body-sm text-text-muted">{description}</p>
    </div>
  )
}
