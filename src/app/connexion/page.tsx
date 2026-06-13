import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { SigninForm } from './components/SigninForm'

// /connexion — the sign-in page. Inherits the navy AuthShell chrome via
// AuthFunnelLayout (title on white, navy box, footer on white). Narrower box than
// signup (480px) since it is only two fields. Replaces the legacy /login, which
// stays live until Commit 5 repoints references and Commit 6 deletes the file.
export default async function ConnexionPage() {
  const lang = await getLang()
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[480px]"
      title={t('signin.title', lang)}
      subtitle={t('signin.subtitle', lang)}
      footer={
        <>
          {t('signin.noAccount', lang)}{' '}
          <Link href="/inscription" className="font-semibold text-[var(--brand-accent)] hover:underline">
            {t('signin.signupLink', lang)}
          </Link>
        </>
      }
    >
      <SigninForm />
    </AuthFunnelLayout>
  )
}
