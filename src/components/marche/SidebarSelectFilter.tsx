'use client'

import { useEffect, useId, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

export type SelectOption = { value: string; label: string }

// A single-select filter group for the consumer sidebar (e.g. Statut on /mes-commandes,
// Type on /mes-favoris). It mirrors the Marché filter groups' collapsible-row pattern but
// holds radios instead of checkboxes, and writes its choice to a URL param so the page body
// (which reads the same param) re-filters. Collapsed by default; when collapsed with a
// non-default value, the row shows the active selection inline ("Statut · En cours"). The
// default value is represented by an absent param so the canonical URL stays clean.
export function SidebarSelectFilter({
  paramName,
  groupLabel,
  options,
  defaultValue,
  basePath,
  ariaShow,
  ariaHide,
}: {
  paramName: string
  groupLabel: string
  options: SelectOption[]
  defaultValue: string
  basePath: string
  ariaShow: string
  ariaHide: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()
  const panelId = useId()

  const raw = sp.get(paramName)
  const current = options.some((o) => o.value === raw) ? (raw as string) : defaultValue
  const activeLabel = options.find((o) => o.value === current)?.label ?? ''
  const isDefault = current === defaultValue

  // Collapsed by default; reset on route change (no persistence across pages). Switching the
  // value only changes the query string (same pathname), so it leaves the group open.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  function select(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value === defaultValue) params.delete(paramName)
    else params.set(paramName, value)
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? ariaHide : ariaShow}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 py-3 text-left text-[13px] font-semibold uppercase tracking-wide text-[#6B6B6B] transition-colors hover:text-[#0A0A0A] ${FOCUS_RING}`}
      >
        <span className="flex items-baseline gap-1.5">
          <span>{groupLabel}</span>
          {/* Active selection shown inline only when collapsed (open groups show the radios). */}
          {!open && !isDefault && (
            <span className="font-semibold normal-case text-brand-accent">· {activeLabel}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6B6B6B] transition-transform duration-200 ease-in-out ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      {/* grid-rows 1fr→0fr animates height to auto; opacity fades; inert drops the clipped
          radios out of the tab order when collapsed. Matches the Marché filter groups. */}
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div role="radiogroup" aria-label={groupLabel} className="space-y-0.5 pb-3">
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-[#0A0A0A]"
              >
                <input
                  type="radio"
                  name={`${panelId}-${paramName}`}
                  checked={o.value === current}
                  onChange={() => select(o.value)}
                  // Minimal, native-free control matching the Marché checkboxes' light weight
                  // (no heavy native radio "ring", no chunky solid fill): a small outlined
                  // circle with a small brand-accent centre dot when selected. bg-clip-content
                  // + p-[3px] confines the checked fill to the inner content box (the dot),
                  // leaving the border as the outline.
                  className={`h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-border-subtle bg-white bg-clip-content p-[3px] transition-colors checked:border-brand-accent checked:bg-brand-accent ${FOCUS_RING}`}
                />
                <span className="line-clamp-1">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
