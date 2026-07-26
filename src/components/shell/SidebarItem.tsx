import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// One sidebar nav row (design system Section 3.2 / Figma 611:45637 Nav Item). 44px tall (WCAG 2.2
// target size), radius 10, 20×20 icon, label 14/21 (text-body-sm). Active = solid brand-blue fill +
// white Semi Bold label + white icon; idle = white Medium label + blue-300 icon (the measured frame
// values — #8faef9 clears WCAG AA at ~7:1 on the navy ground, unlike the slate #64748B the DS avoids
// here); hover = white/5 wash.
//
// rounded-[10px]: `--radius-lg` IS 10px in tokens.css but is not wired into @theme, so Tailwind's
// `rounded-lg` still resolves to its built-in 8px. See the radius follow-up in docs/follow-ups.md.
export function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Label size AND weight live on the span below: text-body-sm bundles font-weight 400, so
        // the two must sit together on the leaf — and text-body-sm in this cn() would be dropped
        // by tailwind-merge against text-white (the documented TopbarSearch gotcha).
        'flex h-11 items-center gap-3 rounded-[10px] px-3 transition-colors',
        active ? 'bg-brand-blue-600 text-white' : 'text-white hover:bg-white/5',
        FOCUS_RING,
      )}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0', !active && 'text-brand-blue-300')}
        aria-hidden="true"
      />
      <span className={cn('truncate text-body-sm', active ? 'font-semibold' : 'font-medium')}>
        {label}
      </span>
    </Link>
  )
}
