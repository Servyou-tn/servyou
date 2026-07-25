'use client'

import { Bell } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { interactiveSurface } from '@/components/ui/interactive-surface'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Topbar notifications (design system Section 3.3). A real notifications backend is post-MVP
// (roadmap), so this is an HONEST empty state — no fabricated count and no red dot (phase-aware:
// never invent metrics). The bell + dropdown are wired and ready for the real feed.
export function TopbarNotifications() {
  const lang = useLang()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('shell.topbar.notifications.title', lang)}
          className={cn(
            // Figma 611:45637 IconButton: 40×40, radius 10 (icon 20).
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
            interactiveSurface(false),
          )}
        >
          <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 overflow-hidden rounded-2xl border border-border-subtle bg-white p-0 shadow-lg"
      >
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="text-label font-semibold text-text-primary">
            {t('shell.topbar.notifications.title', lang)}
          </p>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-body-sm text-text-muted">
            {t('shell.topbar.notifications.empty', lang)}
          </p>
        </div>
        <div className="border-t border-border-subtle px-4 py-2.5 text-center">
          <span className="text-body-sm text-text-muted/70">
            {t('shell.topbar.notifications.viewAll', lang)}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
