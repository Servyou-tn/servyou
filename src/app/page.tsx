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
      <Hero lang={lang} />
      <FounderNote lang={lang} />
    </main>
  )
}
