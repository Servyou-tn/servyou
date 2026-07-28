'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Sort control — Figma's single Select Trigger (compact/single) from filterArea 489:25350:
// 148×40, surface/base, 1px border/strong, radius/lg 10, px-4, label body 16/26, 18px chevron.
//
// A NATIVE <select>, deliberately: it is one control with two options, so the platform's own
// listbox is better than a Radix popover — keyboard, screen-reader and mobile behaviour all come
// free, and this stays the smallest possible client leaf (a router push on change).
//
// WIDTH: Figma's 148 is authored against the PLACEHOLDER ("Plus récentes"), but a live control
// shows the SELECTED value — exactly the trap that wrapped E3's filter labels onto two lines and
// overflowed their box. So 148 is a MINIMUM with a ceiling above it, and the label is
// `whitespace-nowrap` + `truncate`: it can never wrap, and on a narrow viewport it ellipsises
// instead of growing the row.
// Each option carries its OWN href, precomputed on the server. It must not take a
// `buildHref(value)` callback: a function cannot cross the RSC boundary — Next.js throws
// "Functions cannot be passed directly to Client Components" and the route 500s. The page still
// owns query-param composition; it just hands over the finished URLs.
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

  return (
    <>
      <label htmlFor="tri" className="sr-only">
        {label}
      </label>
      <select
        id="tri"
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value)
          if (next) router.push(next.href)
        }}
        className={cn(
          'h-10 min-w-[148px] max-w-[224px] truncate rounded-[10px] border border-border-strong bg-surface-base px-4',
          'text-body text-text-muted whitespace-nowrap',
          FOCUS_RING,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  )
}
