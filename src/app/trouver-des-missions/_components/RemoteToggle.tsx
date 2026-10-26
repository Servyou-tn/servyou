'use client'

import { useRouter } from 'next/navigation'
import { Toggle } from '@/components/ui/toggle'

// « Télétravail accepté » — Figma 311:10865: a bordered control (surface/base, 1 px border/strong, radius lg 10,
// pad 14/10, gap 8) holding the 44 × 24 Toggle and a Medium 14 text/secondary label. The URL is the state:
// flipping it navigates to the precomputed `href` of the opposite state.
//
// The label is a sibling <span> inside a wrapping <label> (not Toggle's own label, which is text/primary): the
// frame's text is text/secondary, and a <label> still forwards a click on the text to the switch button.
export function RemoteToggle({ checked, label, hrefOn, hrefOff }: { checked: boolean; label: string; hrefOn: string; hrefOff: string }) {
  const router = useRouter()
  return (
    <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-border-strong bg-surface-base px-3.5">
      <Toggle checked={checked} onCheckedChange={(next) => router.push(next ? hrefOn : hrefOff)} showLabel={false} aria-label={label} />
      <span className="text-body-sm font-medium whitespace-nowrap text-text-secondary">{label}</span>
    </label>
  )
}
