import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { Hero } from '@/components/landing/Hero'
import { FounderNote } from '@/components/landing/FounderNote'

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
      {/* Soft sky-blue → white backdrop. `fixed` so it also sits behind the
          floating navbar capsule (the Header lives in the root layout, above
          <main>, so a gradient on <main> alone wouldn't reach it). Landing-only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(to bottom, #E0F2FE 0%, #FFFFFF 60%)' }}
      />
      <Hero lang={lang} />
      <FounderNote lang={lang} />
    </main>
  )
}
