'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// H3's 7 accordions (404:12214) — same StatusPill Complet/Incomplet pattern as G2's own
// AccordionSection (ma-boutique/creer/configuration/_components/AccordionSection.tsx), which is
// what the measured H3 frame actually shows ("Complet" pill, screenshot-confirmed on every
// section) — not H2 step 3's static "(optionnel)" suffix variant. Duplicated route-local per this
// codebase's "promote at the third consumer" rule; H3 is the second.
//
// `defaultOpen` is the measured default state per section (404:11909): Confiance & liens, À
// propos, Compétences & langues and Formation & certifications open; Portfolio, Services and
// Contexte collapsed. Native <details>, uncontrolled — matches every other accordion in the
// codebase (no shared ui/accordion exists).
export function AccordionSection({
  title,
  complete,
  defaultOpen,
  children,
}: {
  title: string
  complete: boolean
  defaultOpen?: boolean
  children: ReactNode
}) {
  const lang = useLang()

  return (
    <details
      open={defaultOpen}
      className="group rounded-card border border-border-subtle bg-surface-base [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-5 sm:px-6', FOCUS_RING)}>
        <span className="text-base font-semibold text-text-primary">{title}</span>
        <span className="flex shrink-0 items-center gap-3">
          <StatusPill status={complete ? 'complete' : 'optional'}>
            {t(complete ? 'freelance.edit.badge_complete' : 'freelance.edit.badge_incomplete', lang)}
          </StatusPill>
          <ChevronDown aria-hidden="true" className="h-5 w-5 text-text-muted transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="flex flex-col gap-5 border-t border-border-subtle p-4 sm:p-6">{children}</div>
    </details>
  )
}
