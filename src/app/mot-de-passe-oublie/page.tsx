import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

// /mot-de-passe-oublie — request a reset link. Static header (the success state is
// shown inside the box by ForgotPasswordForm), so it can use AuthFunnelLayout.
// Narrow box (420px) since it's a single field.
export default async function MotDePasseOubliePage() {
  const lang = await getLang()
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[420px]"
      title={t('forgotPassword.title', lang)}
      subtitle={t('forgotPassword.subtitle', lang)}
      footer={
        <>
          {t('forgotPassword.footer.remembered', lang)}{' '}
          <Link href="/connexion" className="font-semibold text-[var(--brand-accent)] hover:underline">
            {t('forgotPassword.footer.signinLink', lang)}
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthFunnelLayout>
  )
}
