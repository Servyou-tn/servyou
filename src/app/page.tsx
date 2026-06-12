import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { Hero } from '@/components/landing/Hero'
import { Problem } from '@/components/landing/Problem'
import { Benefits } from '@/components/landing/Benefits'
import { Journeys } from '@/components/landing/Journeys'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Faq } from '@/components/landing/Faq'
import { FinalCtaFooter } from '@/components/landing/FinalCtaFooter'

// The public marketing landing page (logged-out visitors only). Logged-in users
// are redirected to their role home before any marketing renders.
export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('seller_type, is_admin')
      .eq('id', user.id)
      .single()
    if (error) console.error('[home] profile fetch error:', error)

    if (profile?.is_admin) redirect('/admin')
    if (profile?.seller_type === 'shop_owner') redirect('/ma-boutique')
    if (profile?.seller_type === 'freelancer') redirect('/mon-profil-freelance')
    redirect('/mes-demandes') // default: consumer (and the profile-read-failure fallback)
  }

  const lang = await getLang()

  return (
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
      <HowItWorks lang={lang} />
      <Problem lang={lang} />
      <Benefits lang={lang} />
      <Journeys lang={lang} />
      <Faq lang={lang} />
      <FinalCtaFooter lang={lang} />
    </main>
  )
}
