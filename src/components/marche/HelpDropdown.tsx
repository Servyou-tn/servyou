'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Help / support menu — the first member of the top-bar icon cluster (before the language globe).
// A HelpCircle trigger styled identically to the bell + language buttons (the shared
// `interactiveSurface` is applied via `triggerClassName` from MarcheTopBar, same as the avatar).
// The menu mirrors the avatar + language menus exactly: the Radix dropdown primitive, a white
// rounded surface, align="end" sideOffset={8}. Items are plain <Link>s to the public marketing
// pages (no JS handler, no icons — clean text rows we can grow later as the platform adds support
// surfaces). The trigger is hidden under md by MarcheTopBar (the mobile top row already carries
// logo + search + language/bell/avatar; a 4th 44px icon would collapse the search). FAQ + Contact
// stay reachable on mobile through the shared footer.
export function HelpDropdown({ triggerClassName }: { triggerClassName: string }) {
  const lang = useLang()

  // Same comfortable text row + focus-surface hover as the language switcher's items.
  const itemClass =
    'cursor-pointer rounded-xl px-3 py-2 text-sm text-text-primary focus:bg-surface-subtle focus:text-text-primary'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('help.dropdown.aria_label', lang)}
          className={triggerClassName}
        >
          <HelpCircle className="h-5 w-5 text-text-primary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-44 rounded-2xl border border-border-subtle bg-white p-1 shadow-lg"
      >
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/faq" aria-label={t('help.dropdown.faq', lang)}>
            {t('help.dropdown.faq', lang)}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/contact" aria-label={t('help.dropdown.contact', lang)}>
            {t('help.dropdown.contact', lang)}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
