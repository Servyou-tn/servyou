import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// One sidebar nav row (design system Section 3.2). 44px tall (WCAG 2.2 target size), 20×20 icon,
// label. Active = solid brand-blue fill + white text/icon; idle = muted white; hover = white/5
// wash. The icon inherits currentColor, so the text color drives it.
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
        'flex h-11 items-center gap-3 rounded-card px-3 text-body font-medium transition-colors',
        active
          ? 'bg-brand-blue-600 text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
        FOCUS_RING,
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  )
}
