'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useLang } from '@/components/LangProvider'
import { t, LANG_COOKIE, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// The supported languages, in display order. The pill shows the short language CODE (FR / AR)
// — the segmented control is narrow, so native names ("Français"/"العربية") don't fit. Adding
// a language later is one line here (+ its locale file + the `Lang` union): it becomes a third
// pill, no other change.
const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
]

// Language switch rendered as an FR/AR segmented control (Figma topbar 611:45637 → LangToggle
// 159:11949): a surface-sunken track (radius 10, pad 4) with two 24px pills (pad-x 12, radius 8);
// the active one is a white pill. Behavior is unchanged from the previous globe dropdown — cookie
// first (instant, works for guests), router.refresh() to re-render the server components in the
// new language, then a fire-and-forget profile write for logged-in users. Only the SURFACE
// changed (dropdown → pills). useTransition exposes the transient "pending" state during refresh.
export function LanguageToggle() {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function switchTo(next: Lang) {
    if (next === lang || pending) return
    // eslint-disable-next-line react-hooks/immutability -- document.cookie is set inside the switchTo click handler (event time), not during render; this is an event-time side effect, not a render mutation.
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
    <div
      role="group"
      aria-label={t('nav.switch_language', lang)}
      aria-busy={pending}
      className={cn('inline-flex items-center rounded-[10px] bg-surface-pill p-1', pending && 'opacity-70')}
    >
      {LANGUAGES.map(({ code, label }) => {
        const active = code === lang
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-pressed={active}
            // Plain template (not cn) so text-body-sm survives — tailwind-merge collapses it
            // against the text-{color} classes and would otherwise drop the 14px size to 16px.
            className={`inline-flex h-6 items-center justify-center rounded-lg px-3 text-body-sm font-medium transition-colors ${
              active ? 'bg-white text-text-primary' : 'text-text-secondary hover:text-text-primary'
            } ${FOCUS_RING}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
