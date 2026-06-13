'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { ModerationBanner } from '@/components/ModerationBanner'

type FreelancerProfile = {
  id: string
  headline: string
  bio: string | null
  city: string | null
  portfolio_link: string | null
  years_experience: number | null
  languages: string | null
  admin_hidden_at: string | null
}

type Skill = { id: string; name: string }

export default function MonProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [fp, setFp] = useState<FreelancerProfile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/connexion'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

      const { data: fpData } = await supabase
        .from('freelancer_profiles')
        .select('id, headline, bio, city, portfolio_link, years_experience, languages, admin_hidden_at')
        .eq('profile_id', user.id).maybeSingle()

      if (!fpData) { router.replace('/mon-profil-freelance/creer'); return }

      setFp(fpData)

      const { data: skillRows } = await supabase
        .from('freelancer_skills')
        .select('id, name')
        .eq('freelancer_profile_id', fpData.id)
        .order('created_at', { ascending: true })

      setSkills(skillRows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newSkill.trim()
    if (!trimmed || !fp) return

    setAddingSkill(true)
    const { data, error } = await supabase
      .from('freelancer_skills')
      .insert({ freelancer_profile_id: fp.id, name: trimmed })
      .select('id, name')
      .single()
    setAddingSkill(false)

    if (!error && data) {
      setSkills(prev => [...prev, data])
      setNewSkill('')
    }
  }

  async function handleDeleteSkill(id: string) {
    await supabase.from('freelancer_skills').delete().eq('id', id)
    setSkills(prev => prev.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {fp!.admin_hidden_at && <ModerationBanner variant="freelancer_profile" />}

        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{fp!.headline}</h1>
              {fp!.city && <p className="text-sm text-gray-500 mt-1">{fp!.city}</p>}
            </div>
            <Link href="/mon-profil-freelance/modifier"
              className="text-sm text-blue-600 hover:underline whitespace-nowrap ms-4">
              {t('common.edit', lang)}
            </Link>
          </div>

          {fp!.bio && <p className="text-gray-700 mb-4">{fp!.bio}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            {fp!.years_experience != null && (
              <div>
                <span className="font-medium text-gray-500">{t('freelance.experience_label', lang)}</span>{' '}
                {fp!.years_experience} an{fp!.years_experience !== 1 ? 's' : ''}
              </div>
            )}
            {fp!.languages && (
              <div>
                <span className="font-medium text-gray-500">{t('freelance.languages_label', lang)}</span>{' '}
                {fp!.languages}
              </div>
            )}
            {fp!.portfolio_link && (
              <div className="col-span-2">
                <span className="font-medium text-gray-500">{t('freelance.portfolio_label', lang)}</span>{' '}
                <a href={fp!.portfolio_link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all">
                  {fp!.portfolio_link}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">{t('freelance.skills_section', lang)}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.length === 0 && (
              <p className="text-sm text-gray-400">{t('freelance.no_skills', lang)}</p>
            )}
            {skills.map(s => (
              <span key={s.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
                {s.name}
                <button onClick={() => handleDeleteSkill(s.id)}
                  className="ms-1 text-blue-400 hover:text-red-500 font-medium leading-none"
                  aria-label={t('freelance.delete_skill_label', lang, { name: s.name })}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
              placeholder={t('freelance.add_skill_ph', lang)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={addingSkill || !newSkill.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
              {t('common.add', lang)}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex flex-wrap gap-3">
          <Link href="/mon-profil-freelance/services"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-sm transition-colors">
            {t('freelance.manage_services', lang)}
          </Link>
          <Link href="/mon-profil-freelance/demandes"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-sm transition-colors">
            {t('freelance.received_requests', lang)}
          </Link>
          <Link href={`/freelance/${fp!.id}`}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-5 rounded text-sm transition-colors">
            {t('freelance.view_public', lang)}
          </Link>
        </div>

        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            <DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}
          </Link>
        </div>
      </div>
    </main>
  )
}
