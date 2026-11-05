import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// The card-radio /devenir-vendeur draws (469:20676 / 469:20696): whole-card link, icon,
// title, description, 3 checked points. No internal CTA node in the frame — the card
// itself is the click target, so this is a styled <Link>, not a form control.
//
// `disabled` covers the role-conflict ruling: a user who already holds the OTHER role
// sees this card unavailable with a short explanation, never hidden (hiding the rule
// makes it invisible; showing it disabled teaches it).
export function RoleChoiceCard({
  id,
  href,
  icon,
  title,
  description,
  points,
  disabled,
  unavailableLabel,
}: {
  /** Stable id root for the disabled branch's aria-labelledby/aria-describedby wiring. */
  id: string
  href: string
  icon: ReactNode
  title: string
  description: string
  points: [string, string, string]
  disabled: boolean
  unavailableLabel: string
}) {
  const titleId = `${id}-title`
  const noteId = `${id}-note`
  // 375 (m375-g1-devenir-vendeur): card gap 16 — a round 56 icon, the title 20 Semi Bold / 26, the description 14 / 21,
  // the points 4 lower (20 under it) in text/primary.
  const body = (
    <>
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-50 max-lg:mb-4 max-lg:rounded-full">
        {icon}
      </div>
      <h2 id={titleId} className="mb-3 text-h3 font-bold text-text-primary max-lg:mb-4 max-lg:font-semibold max-lg:leading-[26px]">{title}</h2>
      <p className="mb-6 text-body-sm leading-6 text-text-secondary max-lg:mb-5 max-lg:leading-[21px]">{description}</p>
      <ul className="flex flex-col gap-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-body-sm text-text-secondary max-lg:text-text-primary">
            <Check className="mt-1 h-4 w-4 shrink-0 text-brand-blue-600" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </>
  )

  if (disabled) {
    return (
      <div
        role="group"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        className="flex min-w-0 flex-col rounded-3xl border border-border-subtle bg-surface-subtle p-8 opacity-70 max-lg:rounded-xl max-lg:px-[15px] max-lg:py-[19px]"
      >
        {body}
        <p id={noteId} className="mt-6 rounded-xl bg-white px-4 py-3 text-body-sm text-text-muted">
          {unavailableLabel}
        </p>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col rounded-3xl border-2 border-border-subtle bg-white p-8 max-lg:rounded-xl max-lg:px-[14px] max-lg:py-[18px] transition-colors duration-200 ease-out hover:border-brand-blue-600 ${FOCUS_RING}`}
    >
      {body}
    </Link>
  )
}
