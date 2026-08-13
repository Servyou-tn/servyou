import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Shared consent line for both /devenir-vendeur pitch pages (freelance + boutique) — same
// copy, same target, per founder ruling. Both sibling frames drew a role-specific phrase
// ("conditions d'utilisation freelance" / "... vendeur"), but no such document exists — only
// the general /conditions page does (src/app/(marketing)/conditions/page.tsx). Promising a
// seller-specific document that doesn't exist is worse than linking the general one, so the
// role word is dropped and both pages point here. A dedicated seller-terms document is logged
// as a follow-up (docs/follow-ups.md), not built.
//
// The freelance rebuild (f92d793) cut this line entirely when its age-gate (which held it) was
// cut — silently, never recorded as a decision. This component restores it there too.
export function TermsLine() {
  const lang = useLang()
  return (
    <p className="mt-4 text-xs text-text-muted">
      {t('devenir.terms.prefix', lang)}
      <Link
        href="/conditions"
        className={`underline underline-offset-2 hover:text-text-primary ${FOCUS_RING} rounded`}
      >
        {t('devenir.terms.linkLabel', lang)}
      </Link>
      {t('devenir.terms.suffix', lang)}
    </p>
  )
}
