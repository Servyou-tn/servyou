'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// One of the four collapsible sections in `box` (Figma 556:37583, docs/design/g2-discovery.md
// §12). Native `<details>`/`<summary>` — same proven pattern as /aide's FAQ accordion
// (`aide/page.tsx`), the only other accordion in the codebase; no shared `ui/accordion` exists.
//
// The badge is the ONE source of "have I configured this section" truth — the header text itself
// never carries a static "(optionnel)" suffix (Figma draws one, but a static suffix would read
// wrong the moment the section becomes Complet). See g2-discovery.md §16 for the completeness rule.
export function AccordionSection({
  title,
  complete,
  children,
}: {
  title: string
  complete: boolean
  children: ReactNode
}) {
  const lang = useLang()

  return (
    <details className="group rounded-card border border-border-subtle bg-surface-base [&_summary::-webkit-details-marker]:hidden">
      <summary className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-5 sm:px-6', FOCUS_RING)}>
        <span className="text-base font-semibold text-text-primary">{title}</span>
        <span className="flex shrink-0 items-center gap-3">
          <StatusPill status={complete ? 'complete' : 'optional'}>
            {t(complete ? 'boutique.config.badge_complete' : 'boutique.config.badge_optional', lang)}
          </StatusPill>
          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 text-text-muted transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="flex flex-col gap-5 border-t border-border-subtle p-4 sm:p-6">{children}</div>
    </details>
  )
}
