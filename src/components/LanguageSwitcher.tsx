'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from './LangProvider'
import { LANG_COOKIE, type Lang } from '@/lib/i18n'

export function LanguageSwitcher() {
  const lang = useLang()
  const router = useRouter()
  const supabase = createClient()

  async function switchLang(newLang: Lang) {
    // 1. Cookie — immediate, persists across reloads, works for guests
    document.cookie = `${LANG_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`

    // 2. Trigger re-render of server components with the new cookie value
    //    This is intentionally before the DB write so the UI change is instant.
    router.refresh()

    // 3. Persist to profile for logged-in users — fire-and-forget, does not
    //    block the UI change. Surface any DB error per CLAUDE.md.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ language: newLang })
        .eq('id', user.id)
      if (error) console.error('[LanguageSwitcher] profile language update error:', error)
    }
  }

  // NOTE: the aria-labels below ("Français" / "العربية") are intentionally NOT
  // run through t() and must stay in their own language. By accessibility
  // convention a language name is written in that language, so a screen reader
  // announces each option natively regardless of the current UI language.
  // Do not "translate" these into the active locale.
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => switchLang('fr')}
        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
          lang === 'fr'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        aria-pressed={lang === 'fr'}
        aria-label="Français"
      >
        FR
      </button>
      <button
        onClick={() => switchLang('ar')}
        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
          lang === 'ar'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        aria-pressed={lang === 'ar'}
        aria-label="العربية"
      >
        AR
      </button>
    </div>
  )
}
