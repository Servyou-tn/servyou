import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { firstName } from '@/lib/homepage/homepage-utils'

// The greeting strip — "Bonjour {prénom}" + a quiet subtitle. Text only, no CTAs (the
// discovery weight lives in the strips below). Time-of-day greeting is intentionally
// skipped: server time is UTC, not the user's local time, so "Bonjour" is used always.
export function WelcomeStrip({ fullName, lang }: { fullName: string | null; lang: Lang }) {
  const name = firstName(fullName)
  const greeting = name
    ? t('home.greeting.hello', lang, { name })
    : t('home.greeting.hello_noname', lang)

  return (
    <section className="mb-8">
      <h1 className="text-2xl font-bold text-[#0A0A0A] md:text-3xl">{greeting}</h1>
      <p className="mt-1 text-[14px] text-[#6B6B6B]">{t('home.subtitle', lang)}</p>
    </section>
  )
}
