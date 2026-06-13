import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Vendre" (shop owner) signup form. Account is created
// consumer-baseline; becoming a shop owner happens later at /devenir-vendeur.
export default async function ShopOwnerSignupPage() {
  const lang = await getLang()
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[560px]"
      title={t('signup.form.titles.shopOwner', lang)}
      subtitle={t('signup.form.subtitle', lang)}
      footer={
        <>
          {t('signup.form.signInPrompt', lang)}{' '}
          <Link href="/connexion" className="font-semibold text-[var(--brand-accent)] hover:underline">
            {t('signup.form.signInLink', lang)}
          </Link>
        </>
      }
    >
      <SignupForm role="shopOwner" />
    </AuthFunnelLayout>
  )
}
