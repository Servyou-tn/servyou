'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FreelancerForm } from '@/components/FreelancerForm'
import type {
  FreelancerProfile,
  FreelancerTool,
  FreelancerEducation,
  FreelancerCertification,
} from '@/lib/types/freelancer-config'

export default function ModifierProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [tools, setTools] = useState<FreelancerTool[]>([])
  const [education, setEducation] = useState<FreelancerEducation[]>([])
  const [certifications, setCertifications] = useState<FreelancerCertification[]>([])

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
      const p = fp as FreelancerProfile
      setProfile(p)

      const { data: toolsData, error: toolsError } = await supabase
        .from('freelancer_tools')
        .select('id, freelancer_id, name')
        .eq('freelancer_id', p.id)
        .order('created_at')
      if (toolsError) console.error('[mon-profil-freelance/modifier] tools fetch error:', toolsError)
      setTools((toolsData ?? []) as FreelancerTool[])

      const { data: educationData, error: eduError } = await supabase
        .from('freelancer_education')
        .select('id, freelancer_id, institution, degree, field, year_start, year_end')
        .eq('freelancer_id', p.id)
        .order('year_start', { ascending: false, nullsFirst: false })
      if (eduError) console.error('[mon-profil-freelance/modifier] education fetch error:', eduError)
      setEducation((educationData ?? []) as FreelancerEducation[])

      const { data: certData, error: certError } = await supabase
        .from('freelancer_certifications')
        .select('id, freelancer_id, name, issuing_org, year_obtained, credential_url')
        .eq('freelancer_id', p.id)
        .order('year_obtained', { ascending: false, nullsFirst: false })
      if (certError) console.error('[mon-profil-freelance/modifier] certifications fetch error:', certError)
      setCertifications((certData ?? []) as FreelancerCertification[])

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
        <FreelancerForm
          mode="edit"
          initialProfile={profile}
          initialTools={tools}
          initialEducation={education}
          initialCertifications={certifications}
          onSuccess={() => router.push('/mon-profil-freelance')}
        />
      </div>
    </main>
  )
}
