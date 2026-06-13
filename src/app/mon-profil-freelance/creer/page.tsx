'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FreelancerForm } from '@/components/FreelancerForm'

export default function CreerProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/connexion'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

      const { data: existing } = await supabase
        .from('freelancer_profiles').select('id').eq('profile_id', user.id).maybeSingle()
      if (existing) { router.replace('/mon-profil-freelance'); return }

      setLoading(false)
    }
    check()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('freelance.create_title', lang)}</h1>
        <FreelancerForm mode="create" onSuccess={() => router.push('/mon-profil-freelance')} />
      </div>
    </main>
  )
}
