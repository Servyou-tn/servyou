import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { readOwnContactPhone } from '@/lib/seller/contact-phone'
import { InlineNotice } from '@/components/missions/InlineNotice'
import { FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// The publish gate, shown BEFORE the click (walk 2026-11-02 #17): a freelancer without a contact phone cannot publish
// or reactivate a service — publishServiceDraftAction / toggleServiceStatusAction refuse it, and so does the DB
// (enforce_seller_contact_phone). Freelancers who made their profile before step 1 asked for the phone only learn the
// rule here. Renders nothing when the account has a phone. A failed read renders nothing too (logged in
// readOwnContactPhone): this is a hint, the actions re-check on every publish.
export async function SellerPhoneNotice({ userId, lang }: { userId: string; lang: Lang }) {
  const supabase = await createClient()
  const own = await readOwnContactPhone(supabase, userId)
  if (!own.ok || own.phone) return null
  return (
    <InlineNotice
      title={t('seller.phone.notice.title', lang)}
      actions={
        <Link href="/mon-compte" className={`text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
          {t('seller.phone.notice.cta', lang)}
        </Link>
      }
    >
      {t('seller.phone.notice.body', lang)}
    </InlineNotice>
  )
}
