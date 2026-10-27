import { getLang } from '@/lib/i18n/server'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { resolveRole, accountSpaceHref, type Role } from '@/lib/roles'
import type { HeaderAccount } from '@/lib/layout/nav-config'
import { Header } from '@/components/layout/Header'
import { Hero } from '@/components/landing/Hero'
import { Categories } from '@/components/landing/Categories'
import { Problem } from '@/components/landing/Problem'
import { Benefits } from '@/components/landing/Benefits'
import { Journeys } from '@/components/landing/Journeys'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Faq } from '@/components/landing/Faq'
import { FinalCtaFooter } from '@/components/landing/FinalCtaFooter'
import { ConsumerHomepage } from '@/components/home/ConsumerHomepage'

// / branches by viewer:
//   • logged-out → marketing landing (unchanged)
//   • logged-in consumer (seller_type = null, not admin) → thin landing pointing into the
//     marketplace (no longer a browse surface — see ConsumerHomepage.tsx)
//   • logged-in shop owner / freelancer / admin → marketing landing, whose header shows THEM
//     (avatar + name + a link to their space) instead of « Se connecter / S'inscrire »
export default async function HomePage() {
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

  return <LandingView lang={lang} role={role} account={account} />
}

// The public marketing landing page — shown to logged-out visitors and to logged-in sellers/admins.
// The marketing Header lives here (it only ever renders on this landing branch of `/`); with an
// `account` it shows the viewer instead of the auth CTAs.
function LandingView({ lang, role, account }: { lang: Lang; role: Role; account?: HeaderAccount }) {
  return (
    <>
      <Header sellerType={role} fullName={account?.fullName ?? null} account={account} />
      <main>
      {/* Pure white at the very top so the floating navbar capsule sits on white
          (the Header lives in the root layout above <main>; the blue band there was
          this backdrop, not the hero). A soft sky-blue atmosphere returns lower
          down, then fades back to white. `fixed` so it reaches behind the navbar.
          The #FFFFFF / #E0F2FE stops are a decorative backdrop (E0F2FE ≈ sky-100, no v2 token) — literal. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 14%, #E0F2FE 38%, #FFFFFF 72%)' }}
      />
      <Hero lang={lang} />
      <Categories lang={lang} />
      <HowItWorks lang={lang} />
      <Problem lang={lang} />
      <Benefits lang={lang} />
      <Journeys lang={lang} />
      <Faq lang={lang} />
      <FinalCtaFooter lang={lang} />
      </main>
    </>
  )
}
