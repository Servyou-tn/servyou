'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { FreelancerProfile } from '@/lib/types/freelancer-config'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

type Props = {
  mode: 'create' | 'edit'
  initialProfile?: FreelancerProfile
  onSuccess: (freelancerId: string) => void
}

export function FreelancerForm({ mode, initialProfile, onSuccess }: Props) {
  const supabase = createClient()
  const lang = useLang()

  const [headline, setHeadline] = useState(initialProfile?.headline ?? '')
  const [bio, setBio] = useState(initialProfile?.bio ?? '')
  const [city, setCity] = useState(initialProfile?.city ?? '')
  const [portfolioLink, setPortfolioLink] = useState(initialProfile?.portfolio_link ?? '')
  const [yearsExperience, setYearsExperience] = useState(
    initialProfile?.years_experience != null ? String(initialProfile.years_experience) : '',
  )
  const [languages, setLanguages] = useState(initialProfile?.languages ?? '')
  const [workingHours, setWorkingHours] = useState(initialProfile?.working_hours ?? '')
  const [currentWorkplace, setCurrentWorkplace] = useState(initialProfile?.current_workplace ?? '')
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState(initialProfile?.preferred_payment_method ?? '')

  const [saving, setSaving] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const saveErrorKey = mode === 'create' ? 'freelance.error_create' : 'freelance.error_save'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)

    if (!headline.trim()) { setErrorKey('freelance.error_headline'); return }

    const exp = yearsExperience.trim() ? parseInt(yearsExperience, 10) : null
    if (exp !== null && (Number.isNaN(exp) || exp < 0)) {
      setErrorKey('freelance.error_experience')
      return
    }

    setSaving(true)

    const payload = {
      headline: headline.trim(),
      bio: bio.trim() || null,
      city: city || null,
      portfolio_link: portfolioLink.trim() || null,
      years_experience: exp,
      languages: languages.trim() || null,
      working_hours: workingHours.trim() || null,
      current_workplace: currentWorkplace.trim() || null,
      preferred_payment_method: preferredPaymentMethod.trim() || null,
    }

    let freelancerId: string

    if (mode === 'create') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { console.error('[FreelancerForm] no authenticated user on create'); setErrorKey(saveErrorKey); setSaving(false); return }

      const { data, error } = await supabase
        .from('freelancer_profiles')
        .insert({ profile_id: user.id, ...payload })
        .select('id')
        .single()
      if (error || !data) { console.error('[FreelancerForm] profile insert error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
      freelancerId = data.id
    } else {
      const { error } = await supabase
        .from('freelancer_profiles')
        .update(payload)
        .eq('id', initialProfile!.id)
      if (error) { console.error('[FreelancerForm] profile update error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
      freelancerId = initialProfile!.id
    }

    setSaving(false)
    onSuccess(freelancerId)
  }

  const sectionCls = 'space-y-4 border-t border-gray-100 pt-5'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorKey && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {t(errorKey, lang)}
        </p>
      )}

      {/* Section 1 — Essentiels */}
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="headline">
            {t('freelance.field_headline', lang)} <span className="text-red-500">*</span>
          </label>
          <input id="headline" type="text" required value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder={t('freelance.headline_ph', lang)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="bio">
            {t('freelance.field_bio', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
          </label>
          <textarea id="bio" rows={4} value={bio}
            onChange={e => setBio(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls} htmlFor="city">{t('signup.city', lang)}</label>
          <select id="city" value={city} onChange={e => setCity(e.target.value)}
            className={`${inputCls} bg-white`}>
            <option value="">{t('signup.city_placeholder', lang)}</option>
            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Section 2 — Détails professionnels */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="yearsExperience">
            {t('freelance.field_experience', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
          </label>
          <input id="yearsExperience" type="number" min="0" step="1" value={yearsExperience}
            onChange={e => setYearsExperience(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="languages">
            {t('freelance.field_languages', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
          </label>
          <input id="languages" type="text" value={languages}
            onChange={e => setLanguages(e.target.value)}
            placeholder={t('freelance.languages_ph', lang)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="portfolioLink">
            {t('freelance.field_portfolio', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
          </label>
          <input id="portfolioLink" type="url" value={portfolioLink}
            onChange={e => setPortfolioLink(e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
      </div>

      {/* Section 3 — Disponibilité et préférences (NEW) */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="workingHours">{t('freelance.field_working_hours', lang)}</label>
          <input id="workingHours" type="text" value={workingHours}
            onChange={e => setWorkingHours(e.target.value)}
            placeholder={t('freelance.hint_working_hours', lang)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="currentWorkplace">{t('freelance.field_current_workplace', lang)}</label>
          <input id="currentWorkplace" type="text" value={currentWorkplace}
            onChange={e => setCurrentWorkplace(e.target.value)}
            placeholder={t('freelance.hint_current_workplace', lang)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="preferredPaymentMethod">{t('freelance.field_preferred_payment_method', lang)}</label>
          <input id="preferredPaymentMethod" type="text" value={preferredPaymentMethod}
            onChange={e => setPreferredPaymentMethod(e.target.value)}
            placeholder={t('freelance.hint_preferred_payment_method', lang)} className={inputCls} />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
        {saving
          ? (mode === 'create' ? t('common.creating', lang) : t('common.saving', lang))
          : (mode === 'create' ? t('freelance.action_create', lang) : t('freelance.action_save', lang))}
      </button>
    </form>
  )
}
