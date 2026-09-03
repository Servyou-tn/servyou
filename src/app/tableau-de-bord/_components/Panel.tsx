import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Duplicated from tableau-de-bord-vendeur/_components/Panel.tsx (G4) rather than imported — that
// file's own comment says promote to src/components/ui at the THIRD consumer; H4 is the second,
// so Panel and PanelEmpty both stay route-local per the same rule. Visual contract unchanged:
// surface/base + border/subtle 1px + radius 12 + pad 24 + gap 16; header is a gap-8 row of an
// optional 20px icon and an H3 title, with an optional body-sm link pushed to the end.
export function Panel({
  title,
  icon: Icon,
  iconClassName,
  link,
  children,
}: {
  title: string
  icon?: LucideIcon
  iconClassName?: string
  link?: { href: string; label: string }
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon className={cn('h-5 w-5 shrink-0', iconClassName)} aria-hidden="true" />
        ) : null}
        <h2 className="text-h3 text-text-primary">{title}</h2>
        {link ? (
          <Link
            href={link.href}
            className={`ms-auto rounded text-body-sm text-brand-blue-600 hover:underline ${FOCUS_RING}`}
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

// Panel empty state. Centered icon + one/two-line message, gap-12, py-24 — same treatment G4's
// action-center empty state uses (which is itself DERIVED, no Figma empty variant existed for any
// rail panel). H4's Activité récente panel reuses this shape per Ruling 8.
export function PanelEmpty({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  return (
    <div className="flex w-full items-center justify-center gap-3 py-6">
      <Icon className="h-6 w-6 shrink-0 text-icon-muted" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-text-primary">{title}</p>
        {body ? <p className="text-body text-text-secondary">{body}</p> : null}
      </div>
    </div>
  )
}
