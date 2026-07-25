import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// One sidebar nav row (design system Section 3.2 / Figma 611:45637 Nav Item). 44px tall (WCAG 2.2
// target size), radius 10, 20×20 icon, label. Active = solid brand-blue fill + white text/icon;
// idle = white label + blue-300 icon (the measured frame values — #8faef9 on the navy ground
// clears WCAG AA at ~7:1, unlike the slate #64748B the DS otherwise avoids here); hover = white/5
// wash.
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
        'flex h-11 items-center gap-3 rounded-[10px] px-3 text-body font-medium transition-colors',
        active
          ? 'bg-brand-blue-600 text-white'
          : 'text-white hover:bg-white/5',
        FOCUS_RING,
      )}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0', !active && 'text-brand-blue-300')}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}
