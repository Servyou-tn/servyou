import { getLang } from '@/lib/i18n/server'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Hero } from '@/components/landing/Hero'
import { Categories } from '@/components/landing/Categories'
import { Problem } from '@/components/landing/Problem'
import { Benefits } from '@/components/landing/Benefits'
import { Journeys } from '@/components/landing/Journeys'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Faq } from '@/components/landing/Faq'
import { FinalCtaFooter } from '@/components/landing/FinalCtaFooter'
import { getActiveProducts, getActiveServices } from '@/lib/marche/data'
import type { SearchType } from '@/lib/search/search-params'
import { ConsumerHomepage } from '@/components/home/ConsumerHomepage'

// / branches by viewer:
//   • logged-out → marketing landing (unchanged)
//   • logged-in consumer (seller_type = null, not admin) → discovery homepage
//   • logged-in shop owner / freelancer / admin → marketing landing (their role
//     dashboards have their own entry points; there is no / redirect to preserve today)
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, seller_type, is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (error) console.error('[home] profile fetch error:', error)

    const sellerType = (profile?.seller_type as 'shop_owner' | 'freelancer' | null) ?? null
    const isAdmin = Boolean(profile?.is_admin)

    if (sellerType === null && !isAdmin) {
      // The home IS the marketplace browse: the top-bar toggle drives ?type= in place.
      // Product is the canonical default; only ?type=service flips to the services catalog.
      const sp = await searchParams
      const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type
      const type: SearchType = rawType === 'service' ? 'service' : 'product'
      const products = type === 'product' ? await getActiveProducts() : []
      const services = type === 'service' ? await getActiveServices() : []
      return (
        <ConsumerHomepage
          user={{
            id: user.id,
            email: user.email ?? '',
            full_name: profile?.full_name ?? null,
            seller_type: null,
          }}
          fullName={profile?.full_name ?? null}
          type={type}
          products={products}
          services={services}
          lang={lang}
        />
      )
    }
  }

  return <LandingView lang={lang} />
}

// The public marketing landing page (unchanged) — shown to logged-out visitors and, for
// now, to logged-in sellers/admins. The marketing Header lives here (it only ever renders
// on this landing branch of `/`).
function LandingView({ lang }: { lang: Lang }) {
  return (
    <>
      <Header sellerType={null} fullName={null} />
      <main>
      {/* Pure white at the very top so the floating navbar capsule sits on white
          (the Header lives in the root layout above <main>; the blue band there was
          this backdrop, not the hero). A soft sky-blue atmosphere returns lower
          down, then fades back to white. `fixed` so it reaches behind the navbar. */}
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
