import { redirect } from 'next/navigation'
import { getLang } from '@/lib/i18n/server'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { resolveRole, accountSpaceHref, type Role } from '@/lib/roles'
import type { HeaderAccount } from '@/lib/layout/nav-config'
import { TopBar } from '@/components/landing/TopBar'
import { Hero } from '@/components/landing/Hero'
import { Categories } from '@/components/landing/Categories'
import { RoleShowcase } from '@/components/landing/RoleShowcase'
import { Mission } from '@/components/landing/Mission'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Faq } from '@/components/landing/Faq'
import { FinalCta } from '@/components/landing/FinalCta'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { ConsumerHomepage } from '@/components/home/ConsumerHomepage'
import { expiredLinkRedirect } from '@/lib/auth/expired-link'

// / branches by viewer:
//   • logged-out → marketing landing (unchanged)
//   • logged-in consumer (seller_type = null, not admin) → thin landing pointing into the
//     marketplace (no longer a browse surface — see ConsumerHomepage.tsx)
//   • logged-in shop owner / freelancer / admin → marketing landing, whose header shows THEM
//     (avatar + name + a link to their space) instead of « Se connecter / S'inscrire »
// An expired / used reset link that GoTrue dropped here (?error_code=otp_expired) goes on to
// /nouveau-mot-de-passe first — see lib/auth/expired-link.ts.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const expiredLink = expiredLinkRedirect(await searchParams)
  if (expiredLink) redirect(expiredLink)

  const lang = await getLang()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: Role = null
  let account: HeaderAccount | undefined

  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, seller_type, is_admin, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    // Ruling 3: throw rather than guess. A failed read used to resolve to « consumer » (or the logged-out
    // landing), so a seller was shown the consumer home during an outage.
    if (error) failQuery('home profile', error)

    role = resolveRole(profile)
    const isAdmin = Boolean(profile?.is_admin)

    if (role === null && !isAdmin) {
      return (
        <ConsumerHomepage
          user={{
            id: user.id,
            email: user.email ?? '',
            full_name: profile?.full_name ?? null,
            seller_type: null,
          }}
          lang={lang}
        />
      )
    }

    account = {
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      spaceHref: accountSpaceHref(role, isAdmin),
    }
  }

  return <LandingView lang={lang} account={account} />
}

// The public marketing landing page (Figma « LANDING PAGE v3 », section 1662:29222 — desktop 1662:29225,
// phone 1662:29267, Arabic 1730:52028) — shown to logged-out visitors and to logged-in sellers/admins,
// whose top bar shows THEM (avatar + « Tableau de bord ») instead of « Se connecter / S'inscrire ».
function LandingView({ lang, account }: { lang: Lang; account?: HeaderAccount }) {
  return (
    <div className="bg-surface-base">
      <TopBar account={account} />
      <main>
        <Hero lang={lang} />
        <Categories lang={lang} />
        <RoleShowcase role="free" lang={lang} />
        <RoleShowcase role="shop" lang={lang} />
        <Mission lang={lang} />
        <HowItWorks />
        <Faq />
        <FinalCta lang={lang} />
      </main>
      <LandingFooter />
    </div>
  )
}
