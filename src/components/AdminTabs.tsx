import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Admin « Tabs » (Figma NOV 4 — Admin, J2/J3): a <nav> of links — each tab is a navigation (the
// /mes-annonces reasoning), not a role="tablist". Tab Item h44, px16, gap 8; active Semi Bold blue-600 + 2px
// indicator, inactive Medium muted; optional count badge (16 tall, blue-600, LTR digits). Same recipe as the
// J5 tabs in signalements/_components/ReportsQueueView.tsx. Scrolls sideways when it outgrows 375.
export type AdminTab = { key: string; label: string; href: string; active: boolean; count?: number }

export function AdminTabs({ tabs, label }: { tabs: AdminTab[]; label: string }) {
  return (
    <nav aria-label={label} className="flex min-w-0 overflow-x-auto border-b border-border-subtle bg-surface-base [scrollbar-width:none]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          // text-body is appended OUTSIDE cn(): twMerge would evict it next to the text colour.
          className={`${cn(
            'relative flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 transition-colors',
            tab.active ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-muted hover:text-text-primary',
            FOCUS_RING,
          )} text-body`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span dir="ltr" className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-xs font-semibold text-white">
              {tab.count}
            </span>
          ) : null}
          {tab.active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" /> : null}
        </Link>
      ))}
    </nav>
  )
}
