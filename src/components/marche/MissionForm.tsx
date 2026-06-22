'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { createMission } from '@/app/mes-missions/nouvelle/actions'

// Minimal create-mission form. Validation is shared with the server action
// (validateJobPost); the action redirects to /mes-missions on success, so a resolved
// (non-redirect) return means an error to show.
export function MissionForm({ categories }: { categories: { id: string; name_fr: string }[] }) {
  const lang = useLang()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [isRemote, setIsRemote] = useState(false)
  const [deadline, setDeadline] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createMission({
        title,
        description,
        categoryId,
        city,
        budgetMin,
        budgetMax,
        isRemote,
        deadline,
      })
      // Success redirects server-side (never returns here); only failures resolve.
      if (res && !res.ok) setError(t(res.errorKey, lang))
    })
  }

  const field = `w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-accent ${FOCUS_RING}`
  const label = 'mb-1.5 block text-sm font-medium text-text-primary'

  return (
    <form onSubmit={onSubmit} className={`max-w-2xl rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
      <div className="space-y-5">
        <div>
          <label htmlFor="mission-title" className={label}>
            {t('mission.form.title_label', lang)}
          </label>
          <input
            id="mission-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('mission.form.title_ph', lang)}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="mission-description" className={label}>
            {t('mission.form.description_label', lang)}
          </label>
          <textarea
            id="mission-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('mission.form.description_ph', lang)}
            className={`${field} resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="mission-category" className={label}>
              {t('mission.form.category_label', lang)}
            </label>
            <select
              id="mission-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={field}
            >
              <option value="">{t('mission.form.category_ph', lang)}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_fr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mission-city" className={label}>
              {t('mission.form.city_label', lang)}
            </label>
            <select
              id="mission-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={field}
            >
              <option value="">{t('mission.form.city_ph', lang)}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {lang === 'ar' ? g.ar : g.fr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className={label}>{t('mission.form.budget_label', lang)}</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder={t('mission.form.budget_min_ph', lang)}
              aria-label={t('mission.form.budget_min_ph', lang)}
              className={field}
            />
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder={t('mission.form.budget_max_ph', lang)}
              aria-label={t('mission.form.budget_max_ph', lang)}
              className={field}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="mission-deadline" className={label}>
              {t('mission.form.deadline_label', lang)}
            </label>
            <input
              id="mission-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={field}
            />
          </div>

          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
              className={`h-4 w-4 rounded border-border-subtle text-brand-accent ${FOCUS_RING}`}
            />
            {t('mission.form.remote_label', lang)}
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className={`inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light disabled:opacity-60 ${FOCUS_RING}`}
          >
            {pending ? t('mission.form.submitting', lang) : t('mission.form.submit', lang)}
          </button>
          <a
            href="/mes-missions"
            className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
          >
            {t('mission.form.cancel', lang)}
          </a>
        </div>
      </div>
    </form>
  )
}
