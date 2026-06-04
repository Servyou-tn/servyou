'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

type Category = { id: string; name_fr: string }

export default function PosterMissionPage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

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
  const [profilePhone, setProfilePhone] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: cats } = await supabase
        .from('categories').select('id, name_fr').order('name_fr')
      setCategories((cats as Category[]) ?? [])

      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('phone').eq('id', user.id).single()
      if (profileErr) console.error('[poster-mission] profile fetch error:', profileErr)
      setProfilePhone(profile?.phone ?? null)

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
    if (min !== null && min < 0) { setError(t('poster.error_budget_min', lang)); return }
    if (max !== null && max < 0) { setError(t('poster.error_budget_max', lang)); return }
    if (min !== null && max !== null && min > max) {
      setError(t('poster.error_budget_range', lang)); return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    if (!profilePhone) {
      if (!isValidPhone(phoneInput)) {
        setError(t('common.phone_format_error', lang))
        setSubmitting(false)
        return
      }
      const { error: phoneErr } = await supabase
        .from('profiles')
        .update({ phone: normalizePhone(phoneInput) })
        .eq('id', user.id)
      if (phoneErr) {
        console.error('[poster-mission] phone update error:', phoneErr)
        setError(t('common.phone_save_error', lang))
        setSubmitting(false)
        return
      }
    }

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
      setError(t('poster.error_publish', lang))
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
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('poster.title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow p-6 space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('poster.field_title', lang)} <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t('poster.field_title_ph', lang)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('poster.field_desc', lang)} <span className="text-red-500">*</span>
            </label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('poster.field_desc_ph', lang)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poster.field_budget', lang)}</label>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" step="0.01" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                placeholder={t('poster.field_budget_min', lang)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-500 text-sm">–</span>
              <input type="number" min="0" step="0.01" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                placeholder={t('poster.field_budget_max', lang)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('poster.field_budget_hint', lang)}</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poster.field_category', lang)}</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('poster.field_category_all', lang)}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_fr}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poster.field_location', lang)}</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="remote" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} />
              <label htmlFor="remote" className="text-sm text-gray-600">{t('poster.field_remote', lang)}</label>
            </div>
            {!isRemote && (
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder={t('poster.field_city', lang)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poster.field_deadline', lang)}</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poster.field_skills', lang)}</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                placeholder={t('poster.field_skills_ph', lang)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={addSkill}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-3 py-2 rounded transition-colors">
                {t('poster.skill_add', lang)}
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

          {/* Phone — shown only when profile has no phone */}
          {!profilePhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.phone_label', lang)} <span className="text-red-500">*</span>
              </label>
              <input type="tel" required value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
                placeholder={t('common.phone_placeholder', lang)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">
                {t('common.phone_helper_freelance', lang)}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={submitting || !title.trim() || !description.trim() || (!profilePhone && !phoneInput.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {submitting ? t('poster.submitting', lang) : t('poster.submit', lang)}
          </button>
        </form>

        <div className="mt-4">
          <a href="/mes-missions" className="text-sm text-blue-600 hover:underline">{t('poster.back', lang)}</a>
        </div>
      </div>
    </main>
  )
}
