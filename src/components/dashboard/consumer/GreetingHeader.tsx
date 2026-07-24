'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Manrope display voice is loaded once on the page <main> (--font-display); here we
// only reference it via the `display` class, the same pattern as the auth funnel.
const display = 'font-[family-name:var(--font-display)]'

// Section 1 — the greeting. firstName is the first word of the consumer's full_name
// (resolved server-side); null falls back to a name-less hello.
export function GreetingHeader({ firstName }: { firstName: string | null }) {
  const lang = useLang()
  const title = firstName
    ? t('consumer.dashboard.greeting.title', lang, { name: firstName })
    : t('consumer.dashboard.greeting.hello', lang)

  return (
    <BlurFade delay={0} inView>
      <header className="mb-10 md:mb-12">
        {/* responsive pair retained: md:text-[40px] has no clean tier; half-tokenizing would break the mobile→desktop ramp (DS-3b-3) */}
        <h1
          className={`${display} text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)] md:text-[40px]`}
        >
          {title}
        </h1>
        <p className={`${display} mt-2 text-base font-medium text-[var(--text-muted)] md:text-lg`}>
          {t('consumer.dashboard.greeting.subtitle', lang)}
        </p>
      </header>
    </BlurFade>
  )
}
