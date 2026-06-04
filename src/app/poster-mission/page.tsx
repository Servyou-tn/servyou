'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = { id: string; name_fr: string }

export default function PosterMissionPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')
  const [isRemote, setIsRemote] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: cats } = await supabase
        .from('categories').select('id, name_fr').order('name_fr')
      setCategories((cats as Category[]) ?? [])
      setLoading(false)
    }
    init()
  }, [])

  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }

  function removeSkill(s: string) {
    setSkills(prev => prev.filter(x => x !== s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const min = budgetMin ? parseFloat(budgetMin) : null
    const max = budgetMax ? parseFloat(budgetMax) : null
    if (min !== null && min < 0) { setError('Le budget minimum doit être positif.'); return }
    if (max !== null && max < 0) { setError('Le budget maximum doit être positif.'); return }
    if (min !== null && max !== null && min > max) {
      setError('Le budget minimum ne peut pas dépasser le maximum.'); return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: post, error: postErr } = await supabase
      .from('job_posts')
      .insert({
        consumer_id: user.id,
        title: title.trim(),
        description: description.trim(),
        budget_min: min,
        budget_max: max,
        category_id: categoryId || null,
        city: isRemote ? null : (city.trim() || null),
        is_remote: isRemote,
        deadline: deadline || null,
      })
      .select('id')
      .single()

    if (postErr || !post) {
      setError('Erreur lors de la publication. Veuillez réessayer.')
      setSubmitting(false)
      return
    }

    if (skills.length > 0) {
      await supabase.from('job_post_skills').insert(
        skills.map(skill => ({ job_post_id: post.id, skill }))
      )
    }

    router.push('/mes-missions')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Poster une mission</h1>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow p-6 space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Création d'un logo pour ma boutique"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez votre besoin en détail…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (TND)</label>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" step="0.01" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                placeholder="Min"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-500 text-sm">–</span>
              <input type="number" min="0" step="0.01" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                placeholder="Max"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Laissez vide si le budget est flexible.</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Toutes catégories —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_fr}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="remote" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} />
              <label htmlFor="remote" className="text-sm text-gray-600">Travail à distance possible</label>
            </div>
            {!isRemote && (
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder="Ville / Gouvernorat"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date limite souhaitée</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compétences requises</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                placeholder="Ex : React, Photoshop…"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={addSkill}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-3 py-2 rounded transition-colors">
                Ajouter
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)}
                      className="text-blue-400 hover:text-blue-700 ml-1 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={submitting || !title.trim() || !description.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {submitting ? 'Publication…' : 'Publier la mission'}
          </button>
        </form>

        <div className="mt-4">
          <a href="/mes-missions" className="text-sm text-blue-600 hover:underline">← Mes missions</a>
        </div>
      </div>
    </main>
  )
}
