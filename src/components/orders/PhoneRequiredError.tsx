'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// G2: the order-accept refusal for a seller with no phone — « Ajoutez votre numéro de téléphone dans Mon compte avant d'accepter »,
// with « Mon compte » a link to /mon-compte where the phone is set. The sentence is one key with a {link} slot, so FR and AR each
// place the link where their grammar puts it.
export function PhoneRequiredError({ className = '' }: { className?: string }) {
  const lang = useLang()
  const [before, after = ''] = t('seller.dashboard.error_phone_required', lang).split('{link}')
  return (
    <p role="alert" className={`text-caption text-danger-500 ${className}`}>
      {before}
      <Link href="/mon-compte" className={`rounded-sm font-semibold underline ${FOCUS_RING}`}>
        {t('seller.dashboard.error_phone_link', lang)}
      </Link>
      {after}
    </p>
  )
}
