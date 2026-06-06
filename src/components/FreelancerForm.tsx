'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FreelancerToolsEditor } from '@/components/FreelancerToolsEditor'
import { FreelancerEducationEditor } from '@/components/FreelancerEducationEditor'
import { FreelancerCertificationsEditor } from '@/components/FreelancerCertificationsEditor'
import type {
  FreelancerProfile,
  FreelancerTool,
  FreelancerEducation,
  FreelancerCertification,
  ToolRow,
  EducationRow,
  CertificationRow,
} from '@/lib/types/freelancer-config'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

type Props = {
  mode: 'create' | 'edit'
  initialProfile?: FreelancerProfile
  initialTools?: FreelancerTool[]
  initialEducation?: FreelancerEducation[]
  initialCertifications?: FreelancerCertification[]
  onSuccess: (freelancerId: string) => void
}

export function FreelancerForm({
  mode,
  initialProfile,
  initialTools,
  initialEducation,
  initialCertifications,
  onSuccess,
}: Props) {
  const supabase = createClient()
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)

  // Scalar fields (9)
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

  // Child-table form rows — DB null → '' for controlled inputs; ids preserved.
  const [tools, setTools] = useState<ToolRow[]>(
    () => (initialTools ?? []).map(x => ({ id: x.id, name: x.name })),
  )
  const [education, setEducation] = useState<EducationRow[]>(
    () => (initialEducation ?? []).map(x => ({
      id: x.id, institution: x.institution, degree: x.degree ?? '', field: x.field ?? '',
      year_start: x.year_start, year_end: x.year_end,
    })),
  )
  const [certifications, setCertifications] = useState<CertificationRow[]>(
    () => (initialCertifications ?? []).map(x => ({
      id: x.id, name: x.name, issuing_org: x.issuing_org ?? '',
      year_obtained: x.year_obtained, credential_url: x.credential_url ?? '',
    })),
  )

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

    // Fail-fast child validation BEFORE any DB write: a partially-filled row
    // (some field set but the required field blank) blocks the whole save, so
    // we never silently drop the user's input or write an empty required field.
    const eduInvalid = education.some(row =>
      !row.institution.trim() &&
      (row.degree.trim() !== '' || row.field.trim() !== '' || row.year_start !== null || row.year_end !== null))
    if (eduInvalid) { setErrorKey('freelance.error_institution_required'); return }
    const certInvalid = certifications.some(row =>
      !row.name.trim() &&
      (row.issuing_org.trim() !== '' || row.year_obtained !== null || row.credential_url.trim() !== ''))
    if (certInvalid) { setErrorKey('freelance.error_certification_name_required'); return }

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

    // ===== Profile FIRST (canonical truth) =====
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

    // ===== Tools (delete + insert; UNIQUE(freelancer_id, name) means no update path) =====
    const initialToolIds = new Set((initialTools ?? []).map(x => x.id).filter(Boolean) as string[])
    const currentToolIds = new Set(tools.filter(x => x.id).map(x => x.id!))
    const toolsToDelete = Array.from(initialToolIds).filter(id => !currentToolIds.has(id))
    const toolsToInsert = tools.filter(x => !x.id && x.name.trim() !== '')
    if (toolsToDelete.length > 0) {
      const { error } = await supabase.from('freelancer_tools').delete().in('id', toolsToDelete)
      if (error) { console.error('[FreelancerForm] tools delete error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }
    if (toolsToInsert.length > 0) {
      const { error } = await supabase.from('freelancer_tools').insert(
        toolsToInsert.map(x => ({ freelancer_id: freelancerId, name: x.name.trim() })),
      )
      if (error) { console.error('[FreelancerForm] tools insert error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }

    // ===== Education (delete / insert / update) =====
    const initialEduById = new Map((initialEducation ?? []).map(x => [x.id!, x]))
    const currentEduIds = new Set(education.filter(x => x.id).map(x => x.id!))
    const eduToDelete = Array.from(initialEduById.keys()).filter(id => !currentEduIds.has(id))
    const eduToInsert = education.filter(x => !x.id && x.institution.trim() !== '')
    const eduToUpdate = education.filter(row => {
      if (!row.id) return false
      const init = initialEduById.get(row.id)
      if (!init) return false
      return (
        row.institution.trim() !== (init.institution || '') ||
        (row.degree.trim() || null) !== (init.degree || null) ||
        (row.field.trim() || null) !== (init.field || null) ||
        row.year_start !== (init.year_start ?? null) ||
        row.year_end !== (init.year_end ?? null)
      )
    })
    if (eduToDelete.length > 0) {
      const { error } = await supabase.from('freelancer_education').delete().in('id', eduToDelete)
      if (error) { console.error('[FreelancerForm] education delete error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }
    if (eduToInsert.length > 0) {
      const { error } = await supabase.from('freelancer_education').insert(
        eduToInsert.map(row => ({
          freelancer_id: freelancerId,
          institution: row.institution.trim(),
          degree: row.degree.trim() || null,
          field: row.field.trim() || null,
          year_start: row.year_start,
          year_end: row.year_end,
        })),
      )
      if (error) { console.error('[FreelancerForm] education insert error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }
    for (const row of eduToUpdate) {
      const { error } = await supabase.from('freelancer_education').update({
        institution: row.institution.trim(),
        degree: row.degree.trim() || null,
        field: row.field.trim() || null,
        year_start: row.year_start,
        year_end: row.year_end,
      }).eq('id', row.id!)
      if (error) { console.error('[FreelancerForm] education update error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }

    // ===== Certifications (delete / insert / update) =====
    const initialCertById = new Map((initialCertifications ?? []).map(x => [x.id!, x]))
    const currentCertIds = new Set(certifications.filter(x => x.id).map(x => x.id!))
    const certToDelete = Array.from(initialCertById.keys()).filter(id => !currentCertIds.has(id))
    const certToInsert = certifications.filter(x => !x.id && x.name.trim() !== '')
    const certToUpdate = certifications.filter(row => {
      if (!row.id) return false
      const init = initialCertById.get(row.id)
      if (!init) return false
      return (
        row.name.trim() !== (init.name || '') ||
        (row.issuing_org.trim() || null) !== (init.issuing_org || null) ||
        row.year_obtained !== (init.year_obtained ?? null) ||
        (row.credential_url.trim() || null) !== (init.credential_url || null)
      )
    })
    if (certToDelete.length > 0) {
      const { error } = await supabase.from('freelancer_certifications').delete().in('id', certToDelete)
      if (error) { console.error('[FreelancerForm] certifications delete error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }
    if (certToInsert.length > 0) {
      const { error } = await supabase.from('freelancer_certifications').insert(
        certToInsert.map(row => ({
          freelancer_id: freelancerId,
          name: row.name.trim(),
          issuing_org: row.issuing_org.trim() || null,
          year_obtained: row.year_obtained,
          credential_url: row.credential_url.trim() || null,
        })),
      )
      if (error) { console.error('[FreelancerForm] certifications insert error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
    }
    for (const row of certToUpdate) {
      const { error } = await supabase.from('freelancer_certifications').update({
        name: row.name.trim(),
        issuing_org: row.issuing_org.trim() || null,
        year_obtained: row.year_obtained,
        credential_url: row.credential_url.trim() || null,
      }).eq('id', row.id!)
      if (error) { console.error('[FreelancerForm] certifications update error:', error); setErrorKey('freelance.error_save'); setSaving(false); return }
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
          {tr(errorKey)}
        </p>
      )}

      {/* Section 1 — Essentiels */}
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="headline">
            {tr('freelance.field_headline')} <span className="text-red-500">*</span>
          </label>
          <input id="headline" type="text" required value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder={tr('freelance.headline_ph')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="bio">
            {tr('freelance.field_bio')} <span className="text-gray-400 font-normal">{tr('common.optional_f')}</span>
          </label>
          <textarea id="bio" rows={4} value={bio}
            onChange={e => setBio(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls} htmlFor="city">{tr('signup.city')}</label>
          <select id="city" value={city} onChange={e => setCity(e.target.value)}
            className={`${inputCls} bg-white`}>
            <option value="">{tr('signup.city_placeholder')}</option>
            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Section 2 — Détails professionnels */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="yearsExperience">
            {tr('freelance.field_experience')} <span className="text-gray-400 font-normal">{tr('common.optional_m')}</span>
          </label>
          <input id="yearsExperience" type="number" min="0" step="1" value={yearsExperience}
            onChange={e => setYearsExperience(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="languages">
            {tr('freelance.field_languages')} <span className="text-gray-400 font-normal">{tr('common.optional_m')}</span>
          </label>
          <input id="languages" type="text" value={languages}
            onChange={e => setLanguages(e.target.value)}
            placeholder={tr('freelance.languages_ph')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="portfolioLink">
            {tr('freelance.field_portfolio')} <span className="text-gray-400 font-normal">{tr('common.optional_m')}</span>
          </label>
          <input id="portfolioLink" type="url" value={portfolioLink}
            onChange={e => setPortfolioLink(e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
      </div>

      {/* Section 3 — Disponibilité et préférences */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="workingHours">{tr('freelance.field_working_hours')}</label>
          <input id="workingHours" type="text" value={workingHours}
            onChange={e => setWorkingHours(e.target.value)}
            placeholder={tr('freelance.hint_working_hours')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="currentWorkplace">{tr('freelance.field_current_workplace')}</label>
          <input id="currentWorkplace" type="text" value={currentWorkplace}
            onChange={e => setCurrentWorkplace(e.target.value)}
            placeholder={tr('freelance.hint_current_workplace')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="preferredPaymentMethod">{tr('freelance.field_preferred_payment_method')}</label>
          <input id="preferredPaymentMethod" type="text" value={preferredPaymentMethod}
            onChange={e => setPreferredPaymentMethod(e.target.value)}
            placeholder={tr('freelance.hint_preferred_payment_method')} className={inputCls} />
        </div>
      </div>

      {/* Sections 4-6 — child tables (PR-H2) */}
      <FreelancerToolsEditor tools={tools} setTools={setTools} t={tr} />
      <FreelancerEducationEditor education={education} setEducation={setEducation} t={tr} />
      <FreelancerCertificationsEditor certifications={certifications} setCertifications={setCertifications} t={tr} />

      <button type="submit" disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
        {saving
          ? (mode === 'create' ? tr('common.creating') : tr('common.saving'))
          : (mode === 'create' ? tr('freelance.action_create') : tr('freelance.action_save'))}
      </button>
    </form>
  )
}
