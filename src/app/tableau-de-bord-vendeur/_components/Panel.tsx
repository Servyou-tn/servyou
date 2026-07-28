import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Quiet content panel — measured from the G4 specimen (`panel-Commandes en cours` 752×574,
// `panel-Stock faible` / `panel-Actions rapides` 360 wide). surface/base + border/subtle 1px +
// radius 12 + pad 24 + gap 16; header is a gap-8 row of an optional 20px icon and an H3 title,
// with an optional body-sm link pushed to the end.
//
// Route-local by design: this is the panel's first and only consumer. Promote to
// src/components/ui at the third (the standing rule), which G5/G8 will likely trigger.
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
            className={cn(
              'ms-auto rounded text-body-sm text-brand-blue-600 hover:underline',
              FOCUS_RING,
            )}
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

// Panel empty state. DERIVED — the Figma has no empty variant for either rail panel or for
// "Commandes en cours"; the only empty state in the frame family is the action-center's
// (484:24389: centered icon + two-line message, py-24, gap-12). This mirrors that treatment
// rather than inventing a second empty language, and it is a REAL state for this shop today:
// live data is 1 pending order and 0 in flight, so the monitor renders here, not as a list.
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
