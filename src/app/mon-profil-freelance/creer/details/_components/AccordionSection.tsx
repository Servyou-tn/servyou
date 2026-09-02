'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// H2 step 3's four accordions — Figma 468:20502, header geometry measured (title + static
// "(optionnel)" suffix + chevron, all collapsed by default). Native <details>/<summary>, same
// proven mechanism as G2's AccordionSection (ma-boutique/creer/configuration/_components/
// AccordionSection.tsx) and /aide's FAQ accordion — but NOT a copy of G2's own header shape:
// G2 renders a StatusPill "Complet/Optionnel" badge instead of a static suffix, by its own
// documented choice ("a static suffix would read wrong once complete", g2-discovery.md §16).
// H2's frame draws a literal static "(optionnel)" text suffix, confirmed by measurement — built
// to what was measured, not to G2's differing (and here, unmeasured-as-applicable) pattern.
export function AccordionSection({
  title,
  suffix,
  children,
}: {
  title: string
  /** The measured muted "(optionnel)" marker — a caller-supplied, translated string, not baked in here. */
  suffix: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-card border border-border-subtle bg-surface-base [&_summary::-webkit-details-marker]:hidden">
      <summary className={`flex cursor-pointer items-center justify-between gap-3 rounded-card px-6 py-5 ${FOCUS_RING}`}>
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-text-primary">{title}</span>
          <span className="text-sm text-text-muted">{suffix}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-5 border-t border-border-subtle p-6">{children}</div>
    </details>
  )
}
