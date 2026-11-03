import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { readNext, withNext } from '@/lib/auth/next-param'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Freelance" signup form. Account is created consumer-baseline;
// becoming a freelancer happens later at /devenir-freelance.
export default async function FreelancerSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  // The funnel's ?next= (walk #9): kept on « Se connecter » and handed to the form for the post-verification redirect.
  const next = readNext((await searchParams).next)
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[560px]"
      title={t('signup.form.titles.freelancer', lang)}
      subtitle={t('signup.form.subtitle', lang)}
      homeBar
      homeLabel={t('auth.home', lang)}
      footer={
        <>
          {t('signup.form.signInPrompt', lang)}{' '}
          <Link href={withNext('/connexion', next)} className="font-semibold text-[var(--brand-blue-600)] hover:underline">
            {t('signup.form.signInLink', lang)}
          </Link>
        </>
      }
    >
      <SignupForm role="freelancer" next={next} />
    </AuthFunnelLayout>
  )
}
