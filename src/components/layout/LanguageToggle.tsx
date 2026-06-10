'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t, LANG_COOKIE, type Lang } from '@/lib/i18n'
import { GlobeIcon } from './icons'
import { FOCUS_RING } from './styles'

// FR/AR language toggle. Carries over the exact behavior of the (deleted) floating
// LanguageSwitcher: cookie first (instant, works for guests), router.refresh() to
// re-render server components, then a fire-and-forget profile write for logged-in
// users. useTransition gives the spec's transient "loading" state during the
// refresh; "success" is the active segment moving to the new language.
//
// Two renderings:
//   • mobile  (<md): one compact 44×44 button cycling to the other language
//   • desktop (md+): a two-segment FR | AR pill
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

  const other: Lang = lang === 'fr' ? 'ar' : 'fr'

  return (
    <>
      {/* Mobile: single compact toggle (44×44) → cycles to the other language */}
      <button
        type="button"
        onClick={() => switchTo(other)}
        aria-label={t('nav.switch_language', lang)}
        aria-busy={pending}
        className={`inline-flex h-11 w-11 items-center justify-center gap-0.5 rounded-full bg-surface-pill text-xs font-semibold text-text-primary transition-opacity hover:bg-surface-subtle md:hidden ${pending ? 'opacity-60' : ''} ${FOCUS_RING}`}
      >
        <GlobeIcon className="h-4 w-4" />
        <span className="uppercase">{lang}</span>
      </button>

      {/* Desktop/tablet: two-segment FR | AR pill */}
      <div
        role="group"
        aria-label={t('nav.switch_language', lang)}
        className="hidden items-center gap-0.5 rounded-full bg-surface-pill p-0.5 md:inline-flex"
      >
        {(['fr', 'ar'] as Lang[]).map(code => {
          const active = code === lang
          return (
            <button
              key={code}
              type="button"
              onClick={() => switchTo(code)}
              aria-pressed={active}
              aria-busy={pending && active}
              aria-label={t(code === 'fr' ? 'nav.language_french' : 'nav.language_arabic', lang)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-surface-pill-active text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              } ${pending ? 'opacity-70' : ''} ${FOCUS_RING}`}
            >
              {code.toUpperCase()}
            </button>
          )
        })}
      </div>
    </>
  )
}
