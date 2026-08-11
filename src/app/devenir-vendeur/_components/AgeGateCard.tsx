import { CheckCircle2 } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// 469:20717 — the passing-state confirmation, shown below the two role cards once an
// authenticated visitor's date_of_birth clears the 18+ threshold. Server-computed: this
// renders only after the caller has already checked eligibility, so it never contains the
// check itself. The measured copy shows the FIXED threshold phrase ("18 ans ou plus"), not
// the visitor's actual computed age — deliberately not more specific than the gate needs.
//
// The frame also draws a trailing Button (469:20724) with no recoverable label from
// get_metadata — not built here. See docs/design/g1-discovery.md.
export function AgeGateCard({ dateOfBirth, lang }: { dateOfBirth: string; lang: Lang }) {
  const [year, month, day] = dateOfBirth.split('-')
  const formatted = `${day}/${month}/${year}`

  return (
    <div className="mx-auto mt-8 max-w-[480px] rounded-3xl border border-border-subtle bg-surface-subtle p-6">
      <p className="text-body-sm text-text-secondary">{t('devenir.choice.agegate.message', lang)}</p>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
        <span className="text-body-sm text-text-primary">
          {t('devenir.choice.agegate.dobPass.prefix', lang)}
          <span dir="ltr" className="inline-block">{formatted}</span>
          {t('devenir.choice.agegate.dobPass.suffix', lang)}
        </span>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success-700" aria-hidden="true" />
      </div>
    </div>
  )
}
