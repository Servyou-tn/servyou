import { getLang } from '@/lib/i18n/server'
import { Hero } from '@/components/landing/Hero'
import { Categories } from '@/components/landing/Categories'
import { Problem } from '@/components/landing/Problem'
import { Benefits } from '@/components/landing/Benefits'
import { Journeys } from '@/components/landing/Journeys'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Faq } from '@/components/landing/Faq'
import { FinalCtaFooter } from '@/components/landing/FinalCtaFooter'

// The public marketing landing page — shown to everyone. Logged-in users are no
// longer redirected to a role home: the consumer dashboard was removed in the
// design-phase reset, and role dashboards will be rebuilt with their own entry
// points. Until then, every visitor lands on the marketing page.
export default async function HomePage() {
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
      <Categories lang={lang} />
      <HowItWorks lang={lang} />
      <Problem lang={lang} />
      <Benefits lang={lang} />
      <Journeys lang={lang} />
      <Faq lang={lang} />
      <FinalCtaFooter lang={lang} />
    </main>
  )
}
