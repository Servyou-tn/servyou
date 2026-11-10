'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { LANG_COOKIE, type Lang } from '@/lib/i18n'

// The landing footer's FR | العربية pill switches language exactly like the shared LanguageToggle:
// cookie first (instant, works for guests), router.refresh() to re-render the server components, then a
// fire-and-forget profile write for a signed-in viewer. Kept local so the shared toggle stays untouched.
export function useLangSwitch() {
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
        if (error) console.error('[landing lang switch] profile language update error:', error.message, error.code, error.details)
      }
    })()
  }

  return { lang, pending, switchTo }
}
