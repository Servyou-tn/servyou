'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useLang } from '@/components/LangProvider'
import { t, LANG_COOKIE, type Lang } from '@/lib/i18n'
import { interactiveSurface } from '@/components/ui/interactive-surface'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// The supported languages, in display order — the single source of truth for the switcher.
// Each is labelled by its OWN native name (standard language-picker UX: a reader recognises
// "العربية" regardless of the current UI language). Adding a language later is one line here
// (plus its locale file + the `Lang` union in lib/i18n) — the icon+dropdown UI never changes,
// which is why we moved off the two-segment pill (it cramped past two options).
const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
]

// Language switch, rendered as a globe icon button + dropdown (same Radix menu pattern as the
// avatar). Behavior is unchanged from the previous segmented pill: cookie first (instant, works
// for guests), router.refresh() to re-render the server components in the new language, then a
// fire-and-forget profile write for logged-in users. useTransition exposes the transient
// "pending" state during the refresh.
//
// One rendering for every breakpoint — the dropdown is touch-friendly, so there's no separate
// mobile variant any more. The menu is portaled by Radix (floats above the sticky navbar) and
// closes on select / outside-click / Escape, with arrow-key navigation and aria-haspopup +
// aria-expanded supplied by the primitive.
export function LanguageToggle() {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function switchTo(next: Lang) {
    if (next === lang || pending) return
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
    startTransition(() => router.refresh())

    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from('profiles').update({ language: next }).eq('id', user.id)
        if (error) console.error('[LanguageToggle] profile language update error:', error)
      }
    })()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Globe icon button — same w-11/h-11 round surface + hover/focus as the navbar bell.
            Radix (via asChild) injects aria-haspopup="menu", aria-expanded and data-state. */}
        <button
          type="button"
          aria-label={t('nav.switch_language', lang)}
          aria-busy={pending}
          className={cn(
            'inline-flex w-11 shrink-0 items-center justify-center rounded-full',
            pending && 'opacity-70',
            interactiveSurface(false),
          )}
        >
          <Globe className="h-5 w-5 text-text-primary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      {/* Right-aligned so it never overflows the viewport edge; Radix flips it above the trigger
          when there's no room below (e.g. the footer). White surface mirrors the avatar menu. */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[9rem] rounded-2xl border border-border-subtle bg-white p-1 shadow-lg"
      >
        {LANGUAGES.map(({ code, label }) => {
          const active = code === lang
          return (
            <DropdownMenuItem
              key={code}
              onSelect={() => switchTo(code)}
              aria-current={active ? 'true' : undefined}
              className="cursor-pointer gap-2 rounded-xl px-3 py-2 text-sm text-text-primary focus:bg-surface-subtle focus:text-text-primary"
            >
              <span className="flex-1">{label}</span>
              {active && <Check className="h-4 w-4 text-brand-accent" aria-hidden="true" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
