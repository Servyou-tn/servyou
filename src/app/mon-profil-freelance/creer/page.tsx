'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

export default function CreerProfilFreelancePage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [portfolioLink, setPortfolioLink] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [languages, setLanguages] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

      const { data: existing } = await supabase
        .from('freelancer_profiles').select('id').eq('profile_id', user.id).maybeSingle()
      if (existing) { router.replace('/mon-profil-freelance'); return }

      setUserId(user.id)
      setLoading(false)
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!headline.trim()) { setError('Le titre professionnel est requis.'); return }

    const exp = yearsExperience ? parseInt(yearsExperience) : null
    if (yearsExperience && (isNaN(exp!) || exp! < 0)) {
      setError('Veuillez entrer un nombre d\'années d\'expérience valide.')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('freelancer_profiles').insert({
      profile_id: userId,
      headline: headline.trim(),
      bio: bio.trim() || null,
      city: city || null,
      portfolio_link: portfolioLink.trim() || null,
      years_experience: exp,
      languages: languages.trim() || null,
    })

    setSaving(false)

    if (insertError) {
      setError('Une erreur est survenue lors de la création. Veuillez réessayer.')
      return
    }

    router.push('/mon-profil-freelance')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Créer mon profil freelance</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="headline">
              Titre professionnel <span className="text-red-500">*</span>
            </label>
            <input id="headline" type="text" required value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="Ex : Développeur web React · Sfax"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bio">
              Bio <span className="text-gray-400 font-normal">(optionnelle)</span>
            </label>
            <textarea id="bio" rows={4} value={bio} onChange={e => setBio(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              Ville / Gouvernorat
            </label>
            <select id="city" value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Choisir un gouvernorat —</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="portfolioLink">
              Lien portfolio <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input id="portfolioLink" type="url" value={portfolioLink}
              onChange={e => setPortfolioLink(e.target.value)}
              placeholder="https://monportfolio.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="yearsExperience">
              Années d'expérience <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input id="yearsExperience" type="number" min="0" step="1" value={yearsExperience}
              onChange={e => setYearsExperience(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="languages">
              Langues <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input id="languages" type="text" value={languages}
              onChange={e => setLanguages(e.target.value)}
              placeholder="Ex : Arabe, Français, Anglais"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {saving ? 'Création en cours…' : 'Créer mon profil'}
          </button>
        </form>
      </div>
    </main>
  )
}
