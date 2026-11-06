import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { AlertTriangle } from 'lucide-react'
import { SYSTEM_LINK_CLASS, SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { HitArea } from '@/components/ui/interactive-surface'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.account_suspended', { robots: { index: false } })
}

// K3 — Figma 731:64440 / 734:64519: where the middleware bounces a suspended account (after clearing
// its cookies). Deliberately generic — the suspended_reason is the admin's internal note and is never
// shown. Support is /contact (public); /aide needs a session, which this visitor no longer has. The
// sign-out is the same POST form every other logout uses; with the cookies already gone it is a no-op
// that ends on K1.
export default async function CompteSuspenduPage() {
  const lang = await getLang()
  return (
    <SystemStateScreen
      outlined
      tone="danger"
      icon={<AlertTriangle className="size-16" strokeWidth={1.5} />}
      title={t('system.suspended.title', lang)}
      body={t('system.suspended.body', lang)}
      cta={{ href: '/contact', label: t('system.suspended.cta', lang) }}
      link={
        <form action="/auth/signout" method="POST">
          <button type="submit" className={SYSTEM_LINK_CLASS}>
            {t('system.suspended.signout', lang)}
            <HitArea size={40} />
          </button>
        </form>
      }
    />
  )
}
