import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Freelance" signup form. Account is created consumer-baseline;
// becoming a freelancer happens later at /devenir-freelance.
export default async function FreelancerSignupPage() {
  const lang = await getLang()
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[560px]"
      title={t('signup.form.titles.freelancer', lang)}
      subtitle={t('signup.form.subtitle', lang)}
      footer={
        <>
          {t('signup.form.signInPrompt', lang)}{' '}
          <Link href="/connexion" className="font-semibold text-[var(--brand-blue-600)] hover:underline">
            {t('signup.form.signInLink', lang)}
          </Link>
        </>
      }
    >
      <SignupForm role="freelancer" />
    </AuthFunnelLayout>
  )
}
