'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MENU_CONTENT, MENU_ITEM } from '@/components/ui/menu-styles'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Sort control — Figma's Select Trigger from filterArea 489:25350: 148×40, surface/base, 1px
// border/strong, radius/lg 10, px-4, label body, chevron.
//
// ⚑ THE PANEL, not the trigger, is what changed here. This started as a native <select>, whose
// open list is drawn by the OS: measured, the page had **no `[role=menu]` in the DOM at all**, so
// the panel inherited none of the app's tokens — no radius-xl, no border-subtle, no shadow-lg, no
// 32px items, no hover or selected treatment. Every other single-select in the app (
// ServicesFilterBar's Catégorie and Ville, E3's Statut and Trier) is a Radix DropdownMenu with the
// shared MENU_CONTENT / MENU_ITEM overrides and `align="start"`, so this now is too. Reconciled to
// the established pattern rather than to a new one.
//
// WIDTH: Figma's 148 is authored against the PLACEHOLDER, but a live control shows the SELECTED
// value — the trap that wrapped E3's filter labels. So 148 is a MINIMUM with a 224 ceiling, and
// the label is nowrap + truncate: it can never wrap, and ellipsises instead of growing the row.
//
// RSC BOUNDARY: options carry their own precomputed `href`. This must not take a
// `buildHref(value)` callback — a function cannot cross the server/client boundary and the route
// 500s ("Functions cannot be passed directly to Client Components"). `onValueChange` below is a
// handler created INSIDE this client component, which is a different thing and is fine.
export function SortSelect({
  value,
  options,
  label,
}: {
  value: string
  options: { value: string; label: string; href: string }[]
  label: string
}) {
  const router = useRouter()
  const current = options.find((o) => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          'inline-flex h-10 min-w-[148px] max-w-[224px] items-center justify-between gap-2',
          'rounded-[10px] border border-border-strong bg-white px-4',
          'text-body text-text-muted transition-colors hover:border-text-muted',
          FOCUS_RING,
        )}
      >
        <span className="truncate whitespace-nowrap">{current?.label ?? label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={MENU_CONTENT}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            const next = options.find((o) => o.value === v)
            if (next) router.push(next.href)
          }}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className={MENU_ITEM}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
