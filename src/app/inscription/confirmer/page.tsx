import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { primaryBtn } from '@/components/auth/field-styles'
import { readNext } from '@/lib/auth/next-param'
import { AUTH_CONFIRM_PATH } from '@/lib/auth/email-link'
import { newLinkPath, parseConfirmParams } from '@/lib/auth/confirm-link'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('confirmLink.title')
}

// The step between the e-mailed link and /auth/confirm (two-step sign-up). The link's one-time hash is spent only when a
// person presses « Continuer » (a POST): mail scanners and link previews that open the link spend nothing. Same pattern
// as the reset link (NewPasswordForm). A plain HTML form: it works before (and without) JavaScript.
export default async function ConfirmerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  const sp = await searchParams
  const next = readNext(sp.next)
  const params = new URLSearchParams()
  for (const key of ['token_hash', 'type'] as const) {
    const value = sp[key]
    if (typeof value === 'string') params.set(key, value)
  }
  const input = parseConfirmParams(params)
  if (input.kind !== 'token') redirect(newLinkPath('invalide', next))

  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[480px]"
      title={t('confirmLink.title', lang)}
      subtitle={t('confirmLink.subtitle', lang)}
      homeBar
      homeLabel={t('auth.home', lang)}
    >
      <form action={AUTH_CONFIRM_PATH} method="post">
        <input type="hidden" name="token_hash" value={input.tokenHash} />
        <input type="hidden" name="type" value="email" />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <button type="submit" className={primaryBtn}>
          {t('verifyEmail.state2.continue', lang)}
        </button>
      </form>
    </AuthFunnelLayout>
  )
}
