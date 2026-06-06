'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FreelancerForm } from '@/components/FreelancerForm'
import type { FreelancerProfile } from '@/lib/types/freelancer-config'

export default function ModifierProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!prof || prof.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

      const { data: fp, error: fpError } = await supabase
        .from('freelancer_profiles')
        .select('id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, working_hours, current_workplace, preferred_payment_method, created_at, updated_at')
        .eq('profile_id', user.id)
        .single()
      if (fpError) console.error('[mon-profil-freelance/modifier] profile fetch error:', fpError)
      if (!fp) { router.replace('/mon-profil-freelance/creer'); return }

      setProfile(fp as FreelancerProfile)
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('freelance.edit_title', lang)}</h1>
        <FreelancerForm mode="edit" initialProfile={profile} onSuccess={() => router.push('/mon-profil-freelance')} />
      </div>
    </main>
  )
}
