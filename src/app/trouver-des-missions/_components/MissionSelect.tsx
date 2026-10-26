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
import { FOCUS_RING } from '@/components/layout/styles'

// Single-select trigger for the H9 filter bar — Figma 311:10821 (docs/design/h9-h13-measurements.md §1.1 3a):
// field h 44, surface/base, 1 px border/strong, radius lg 10, px 16, body placeholder in text/muted, chevron 18.
// Same Radix menu as SortSelect/ServicesFilterBar, so the open panel carries the app's tokens.
//
// RSC boundary: every option arrives with its precomputed `href` (a callback prop cannot cross into a client
// component). The first entry is the « all » option, which removes the param.
const ALL = '__all__'

export type MissionSelectOption = { value: string; label: string; href: string }

export function MissionSelect({
  label,
  placeholder,
  value,
  allOption,
  options,
  disabled = false,
  alwaysSelected = false,
  className = '',
}: {
  /** Accessible name of the trigger (the visible text is the placeholder or the selection). */
  label: string
  placeholder: string
  /** The selected option's value, or null when nothing is filtered. */
  value: string | null
  allOption: { label: string; href: string }
  options: MissionSelectOption[]
  disabled?: boolean
  /** The control always shows a real choice (the sort): its default label reads as a value, not a placeholder. */
  alwaysSelected?: boolean
  className?: string
}) {
  const router = useRouter()
  const current = value ? options.find((o) => o.value === value) : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-11 min-w-0 items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-surface-base px-4 text-body transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:hover:border-border-strong ${
          current || alwaysSelected ? 'text-text-primary' : 'text-text-muted'
        } ${FOCUS_RING} ${className}`}
      >
        <span className="truncate whitespace-nowrap">{current?.label ?? placeholder}</span>
        <ChevronDown className="size-[18px] shrink-0 text-text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={`max-h-80 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto ${MENU_CONTENT}`}>
        <DropdownMenuRadioGroup
          value={current ? current.value : ALL}
          onValueChange={(v) => {
            router.push(v === ALL ? allOption.href : (options.find((o) => o.value === v)?.href ?? allOption.href))
          }}
        >
          <DropdownMenuRadioItem value={ALL} className={MENU_ITEM}>
            {allOption.label}
          </DropdownMenuRadioItem>
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
