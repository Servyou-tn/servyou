import type { Metadata } from 'next'
import { Clock } from 'lucide-react'
import { HomeLink, SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Session expirée — Servyou', robots: { index: false } }

// K2 — Figma 731:64405 / 734:64510. The middleware sends a visitor here (clearing the stale auth
// cookies) when their session can no longer be refreshed. `?next=` is the page they were on; it is
// forwarded to /connexion only as a same-site absolute path — never a scheme or `//host`.
function safeNext(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

export default async function SessionExpireePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [lang, sp] = await Promise.all([getLang(), searchParams])
  const next = safeNext(sp.next)
  return (
    <SystemStateScreen
      tone="warning"
      icon={<Clock className="size-16" strokeWidth={1.5} />}
      title={t('system.expired.title', lang)}
      body={t('system.expired.body', lang)}
      cta={{ href: next ? `/connexion?next=${encodeURIComponent(next)}` : '/connexion', label: t('system.expired.cta', lang) }}
      link={<HomeLink lang={lang} />}
    />
  )
}
