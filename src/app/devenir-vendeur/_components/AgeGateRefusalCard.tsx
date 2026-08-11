import Link from 'next/link'
import { Info } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// 555:37196 — "G1 - refus moins de 18 ans". Swaps in for the whole cards+age-gate region
// when an authenticated visitor's date_of_birth is under 18, BEFORE either role card is
// offered. The DB trigger (enforce_seller_type_age_gate, 23514) stays as the last line of
// defence; this makes it unreachable through the UI.
//
// The frame's Alert (555:37200) and Button (555:37201) are instances — get_metadata cannot
// see their internal copy. Both are INVENTED here, flagged in docs/design/g1-discovery.md,
// styled after the existing SuspendedBanner/ModerationBanner alert-block convention rather
// than a new pattern.
export function AgeGateRefusalCard({ dateOfBirth, lang }: { dateOfBirth: string; lang: Lang }) {
  const [year, month, day] = dateOfBirth.split('-')
  const formatted = `${day}/${month}/${year}`

  return (
    <div className="mx-auto mt-8 max-w-[496px] rounded-3xl border border-border-subtle bg-white p-6">
      <h2 className="text-h4 font-bold text-text-primary">
        {t('devenir.choice.agegate.refusal.heading', lang)}
      </h2>
      <p className="mt-3 text-body-sm text-text-secondary">{t('devenir.choice.agegate.message', lang)}</p>
      <p className="mt-4 text-body-sm text-text-muted">
        {t('devenir.choice.agegate.dobFail.prefix', lang)}
        <span dir="ltr" className="inline-block">{formatted}</span>
        {t('devenir.choice.agegate.dobFail.suffix', lang)}
      </p>
      <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('devenir.choice.agegate.refusal.alertTitle', lang)}
        </p>
        <p className="mt-1 text-red-700">{t('devenir.choice.agegate.refusal.alertMessage', lang)}</p>
      </div>
      <Link
        href="/"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-blue-600 px-6 font-semibold text-white transition-colors duration-200 ease-out hover:bg-brand-blue-500 ${FOCUS_RING}`}
      >
        {t('devenir.choice.agegate.refusal.button', lang)}
      </Link>
    </div>
  )
}
