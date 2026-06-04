'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

export default function ModifierProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fpId, setFpId] = useState<string | null>(null)

  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [portfolioLink, setPortfolioLink] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [languages, setLanguages] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

      const { data: fp } = await supabase
        .from('freelancer_profiles')
        .select('id, headline, bio, city, portfolio_link, years_experience, languages')
        .eq('profile_id', user.id).single()
      if (!fp) { router.replace('/mon-profil-freelance/creer'); return }

      setFpId(fp.id)
      setHeadline(fp.headline ?? '')
      setBio(fp.bio ?? '')
      setCity(fp.city ?? '')
      setPortfolioLink(fp.portfolio_link ?? '')
      setYearsExperience(fp.years_experience != null ? String(fp.years_experience) : '')
      setLanguages(fp.languages ?? '')
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!headline.trim()) { setError(t('freelance.error_headline', lang)); return }

    const exp = yearsExperience ? parseInt(yearsExperience) : null
    if (yearsExperience && (isNaN(exp!) || exp! < 0)) {
      setError(t('freelance.error_experience', lang))
      return
    }

    setSaving(true)

    const { error: updateError } = await supabase.from('freelancer_profiles').update({
      headline: headline.trim(),
      bio: bio.trim() || null,
      city: city || null,
      portfolio_link: portfolioLink.trim() || null,
      years_experience: exp,
      languages: languages.trim() || null,
    }).eq('id', fpId)

    setSaving(false)

    if (updateError) {
      setError(t('freelance.error_save', lang))
      return
    }

    router.push('/mon-profil-freelance')
  }

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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('freelance.edit_title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="headline">
              {t('freelance.field_headline', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="headline" type="text" required value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bio">
              {t('freelance.field_bio', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
            </label>
            <textarea id="bio" rows={4} value={bio} onChange={e => setBio(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              {t('signup.city', lang)}
            </label>
            <select id="city" value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('signup.city_placeholder', lang)}</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="portfolioLink">
              {t('freelance.field_portfolio', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
            </label>
            <input id="portfolioLink" type="url" value={portfolioLink}
              onChange={e => setPortfolioLink(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="yearsExperience">
              {t('freelance.field_experience', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
            </label>
            <input id="yearsExperience" type="number" min="0" step="1" value={yearsExperience}
              onChange={e => setYearsExperience(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="languages">
              {t('freelance.field_languages', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
            </label>
            <input id="languages" type="text" value={languages}
              onChange={e => setLanguages(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {saving ? t('common.saving', lang) : t('common.save', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
