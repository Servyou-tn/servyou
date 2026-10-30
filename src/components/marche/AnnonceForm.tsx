'use client'

import { useState, useTransition, useId } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t, tn } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { SELECT_FIELD_BASE } from '@/components/layout/styles'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SettingRow } from '@/components/ui/setting-row'
import { SkillsPicker } from '@/components/missions/SkillsPicker'
import { BASE as BUTTON_BASE, Button, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { createAnnonce } from '@/app/mes-annonces/nouvelle/actions'
import { updateAnnonce } from '@/app/mes-annonces/[id]/modifier/actions'
import { ANNONCE_DESCRIPTION_MAX, ANNONCE_SKILLS_MAX, ANNONCE_TITLE_MAX, BUDGET_MAX, type JobPostInput } from '@/lib/marche/job-post-validation'
import { JOB_POST_EXPIRY_DAYS, MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import type { AnnonceCategoryOption } from '@/lib/marche/my-data'
import { getSkillPool } from '@/lib/taxonomy/service-categories'
import { cn } from '@/lib/utils'

// F2 « Publier une annonce » — Figma 1478:29808 (+ 375 frame 1488:65880), docs/design/mes-annonces-measurements.md §F2. This is the MAIN
// card only: the page puts the tips card beside it. Field order and copy are the frame's: titre · catégorie · description · budget ·
// ville · « réalisable à distance » switch · date limite · compétences, then the 30-day note and Annuler / Publier l’annonce.
//
// FIELD MARKING follows the frame: required fields carry the red asterisk (Input / Textarea `required` = asterisk + aria-required; the
// two native selects mark theirs by hand), optional ones say so in the label or the helper.
//
// Decisions (founder, 2026-10-30): D3 ONE « Budget approximatif » field, saved as budget_max (budget_min stays null) · D4 title ≤ 60 and
// description ≤ 500 with counters · skills stay the SkillsPicker (separate tags, never split on a space); text typed but not confirmed
// becomes a tag when the picker closes, so a submit never loses it · D5 no page H1 (breadcrumb + the card's H2).
//
// Form and error state hold i18n KEYS, never resolved text — a language switch re-renders the same state in the new language.
//
// EDIT MODE (PR-3, /mes-annonces/[id]/modifier): the same card, started from the stored post (`edit.initial`), saved through updateAnnonce.
// The server re-reads the post and decides (owner, still open, no proposal yet — the DB freezes the content once one arrives); the
// title / description limits apply to an edit only where the text changed (validateJobPost's `original`), which the form cannot know, so
// its own counter check is skipped for a field left at its stored value.

/** Edit mode: the post's id, its stored values, and — for an old post saved with a min–max budget — the range text to show (kept unless the amount changes). */
export type AnnonceFormEdit = { id: string; initial: JobPostInput; legacyRange: string | null }

type Field = 'title' | 'description' | 'category' | 'city' | 'budget' | 'deadline'
type Errors = Partial<Record<Field, string>>

export function AnnonceForm({ categories, edit }: { categories: AnnonceCategoryOption[]; edit?: AnnonceFormEdit }) {
  const lang = useLang()
  const router = useRouter()
  const initial = edit?.initial
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Errors>({})
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [budget, setBudget] = useState(initial?.budget ?? '')
  const [isRemote, setIsRemote] = useState(initial?.isRemote ?? false)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? [])

  // Suggestions for the CHOSEN category only (taxonomy sector = categories.slug). Stored as the French label so a freelancer's
  // profile skill and a post skill compare as the same text whichever language the poster browses in.
  const chosenSlug = categories.find((c) => c.id === categoryId)?.slug
  const skillSections = chosenSlug
    ? [{ id: 'suggested', label: t('annonce.form.skills_suggested', lang), options: getSkillPool(chosenSlug).map((s) => s.labelFr) }]
    : []

  // Validation is duplicated on purpose, not defensively — same posture as E1 (ServiceRequestForm.tsx): these are UX checks and
  // job-post-validation.ts's validateJobPost re-runs the real ones server-side. The floors match, so a client-side pass cannot
  // produce a server-side reject the user never saw coming.
  function validate(): Errors {
    const next: Errors = {}
    if (!title.trim()) next.title = 'annonce.error.title_required'
    else if (title.trim().length > ANNONCE_TITLE_MAX && title.trim() !== initial?.title.trim()) next.title = 'annonce.error.title_max'
    if (!description.trim()) next.description = 'annonce.error.description_required'
    else if (description.trim().length > ANNONCE_DESCRIPTION_MAX && description.trim() !== initial?.description.trim()) {
      next.description = 'annonce.error.description_max'
    }
    if (!categoryId) next.category = 'annonce.error.category_required'
    if (!city) next.city = 'annonce.error.city_required'

    const budgetRaw = budget.trim()
    if (budgetRaw !== '') {
      const n = Number(budgetRaw)
      if (!Number.isFinite(n) || n < 0 || n > BUDGET_MAX) next.budget = 'annonce.error.budget_invalid'
    }

    if (deadline.trim()) {
      const [y, m, d] = deadline.trim().split('-').map(Number)
      const chosen = new Date(y, (m ?? 1) - 1, d ?? 1)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // A deadline left at its stored value is not an error just because that day has since passed (an edit).
      if (Number.isNaN(chosen.getTime()) || (chosen < today && deadline.trim() !== initial?.deadline)) next.deadline = 'annonce.error.deadline_past'
    }

    return next
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormErrorKey('annonce.form.fix_errors')
      return
    }
    setFormErrorKey(null)
    const values = { title, description, categoryId, city, budget, isRemote, deadline, skills }
    startTransition(async () => {
      if (edit) {
        const res = await updateAnnonce(edit.id, values)
        if (!res.ok) {
          setFormErrorKey(res.errorKey)
          return
        }
        // A client navigation, not a server redirect, so the toast survives (the Sonner toaster lives in the root layout).
        toast.success(t('annonce.form.edit_saved', lang))
        router.push(`/mes-annonces/${edit.id}`)
        router.refresh()
        return
      }
      const res = await createAnnonce(values)
      // Success redirects server-side (never returns here); only failures resolve — the two cap refusals (5 open / 10 per 24 h)
      // arrive here as their own keys.
      if (res && !res.ok) setFormErrorKey(res.errorKey)
    })
  }

  const err = (field: Field) => (errors[field] ? t(errors[field], lang) : undefined)

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-w-0 flex-col gap-6 rounded-xl border border-border-subtle bg-surface-base px-4 py-5 shadow-xs sm:p-8"
    >
      <div className="flex flex-col gap-5">
        <h2 className="text-h3 text-text-primary">{t(edit ? 'annonce.form.edit_title' : 'annonce.form.section_title', lang)}</h2>

        <Input
          id="annonce-title"
          label={t('annonce.form.title_label', lang)}
          placeholder={t('annonce.form.title_ph', lang)}
          helper={t('annonce.form.title_helper', lang)}
          required
          maxLength={ANNONCE_TITLE_MAX}
          error={err('title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <SelectField
          id="annonce-category"
          label={t('annonce.form.category_label', lang)}
          placeholder={t('annonce.form.category_ph', lang)}
          value={categoryId}
          onChange={setCategoryId}
          error={err('category')}
          options={categories.map((c) => ({ value: c.id, label: lang === 'ar' ? (c.name_ar ?? c.name_fr) : c.name_fr }))}
        />

        <Textarea
          id="annonce-description"
          label={t('annonce.form.description_label', lang)}
          placeholder={t('annonce.form.description_ph', lang)}
          helper={t('annonce.form.description_helper', lang)}
          required
          counter
          maxLength={ANNONCE_DESCRIPTION_MAX}
          error={err('description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <PriceField
          label={t('annonce.form.budget_label', lang)}
          helper={
            edit?.legacyRange && budget === initial?.budget
              ? t('annonce.form.budget_legacy', lang, { range: edit.legacyRange })
              : t('annonce.form.budget_helper', lang)
          }
          currency={t('annonce.form.budget_currency', lang)}
          value={budget}
          onChange={setBudget}
          error={err('budget')}
        />

        <SelectField
          id="annonce-city"
          label={t('annonce.form.city_label', lang)}
          placeholder={t('annonce.form.city_ph', lang)}
          value={city}
          onChange={setCity}
          error={err('city')}
          options={GOVERNORATES.map((g) => ({ value: g.value, label: lang === 'ar' ? g.ar : g.fr }))}
        />

        {/* F5-distance (1478:35767): Setting Row — min-h 72, py 16, border-b border/subtle, label 16 Semi Bold + helper 14 muted. */}
        <SettingRow
          variant="toggle"
          className="border-b border-border-subtle"
          label={t('annonce.form.remote_title', lang)}
          description={t('annonce.form.remote_helper', lang)}
          checked={isRemote}
          onCheckedChange={setIsRemote}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="annonce-deadline" className="text-sm font-medium text-text-secondary">
            {t('annonce.form.deadline_label', lang)}
          </label>
          {/* Native date input, styled — no DS DatePicker exists. Chromium renders its built-in picker/placeholder in the OS locale
              regardless of `lang` (SignupForm.tsx's own `type="date"` field has it identically). */}
          <input
            id="annonce-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-invalid={errors.deadline ? true : undefined}
            aria-describedby="annonce-deadline-note"
            className={`${SELECT_FIELD_BASE} ${errors.deadline ? 'border-danger-500' : 'border-border-strong'}`}
          />
          <p id="annonce-deadline-note" className={cn('text-sm', errors.deadline ? 'text-danger-500' : 'text-text-muted')}>
            {errors.deadline ? t(errors.deadline, lang) : t('annonce.form.deadline_helper', lang)}
          </p>
        </div>

        {/* Skills are SEPARATE tags picked from the chosen category's pool, or typed and added one at a time (commas separate several,
            a space never does). The category is never chosen for the user: the suggestions simply appear once they pick one. */}
        <SkillsPicker
          sections={skillSections}
          value={skills}
          onChange={setSkills}
          max={ANNONCE_SKILLS_MAX}
          label={t('annonce.form.skills_label', lang)}
          helper={t('annonce.form.skills_helper', lang)}
          placeholder={t('annonce.form.skills_pick', lang)}
          selectedLabel={(n) => tn('annonce.form.skills_selected', lang, n)}
          removeLabel={(skill) => t('annonce.form.skills_remove', lang, { name: skill })}
          searchPlaceholder={t('annonce.form.skills_search', lang)}
          emptyLabel={t('annonce.form.skills_empty', lang)}
          custom={{ addLabel: (name) => t('annonce.form.skills_add', lang, { name }), maxLength: 60 }}
        />
      </div>

      <p className="text-caption text-text-muted">
        {t('annonce.form.lifetime_note', lang, { days: JOB_POST_EXPIRY_DAYS, max: MAX_RESPONSES_PER_POST })}
      </p>

      {formErrorKey && (
        <p role="alert" className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
          {t(formErrorKey, lang)}
        </p>
      )}

      {/* actions (1478:29834): space-between — Annuler secondary md · Publier l’annonce primary lg (48). One row at 375. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={edit ? `/mes-annonces/${edit.id}` : '/mes-annonces'}
          className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.secondary, VARIANT_STATE.secondary)}
        >
          {t('annonce.form.cancel', lang)}
        </Link>
        <Button type="submit" size="lg" loading={pending}>
          {pending
            ? t(edit ? 'annonce.form.edit_submitting' : 'annonce.form.submitting', lang)
            : t(edit ? 'annonce.form.edit_submit' : 'annonce.form.submit', lang)}
        </Button>
      </div>
    </form>
  )
}

// A native <select> with the Input primitive's anatomy: label 14 Medium + red asterisk (gap 2), field h 44, error replaces nothing —
// it sits under the field. `aria-required` is wired by hand because the primitive does not cover selects.
function SelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  options,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
        <span aria-hidden="true" className="text-danger-500"> *</span>
      </label>
      <select
        id={id}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${SELECT_FIELD_BASE} ${error ? 'border-danger-500' : 'border-border-strong'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}

// Price Input — Figma 1478:29830: label 14 Semi Bold (no asterisk: optional), field h 44 with a « TND » suffix cell (surface/sunken,
// border-s border/subtle, px 12/14, 14 Medium muted), helper 12/17. E1's composite (ServiceRequestForm.tsx), kept local: its `id` is
// per-instance (useId) so label, helper and error association can never collide. The number stays LTR in RTL.
function PriceField({
  label,
  helper,
  currency,
  value,
  onChange,
  error,
}: {
  label: string
  helper: string
  /** « TND » / « د.ت » */
  currency: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const reactId = useId()
  const fieldId = `${reactId}-budget`
  const noteId = `${reactId}-budget-note`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-text-secondary">
        {label}
      </label>
      <div
        className={`flex h-11 items-center overflow-hidden rounded-lg border bg-surface-base ${
          error ? 'border-danger-500' : 'border-border-strong'
        } focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 focus-within:ring-offset-surface-base`}
      >
        <input
          id={fieldId}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={noteId}
          aria-invalid={error ? true : undefined}
          className="h-full w-full min-w-0 bg-transparent px-4 text-base text-text-primary outline-none placeholder:text-text-muted"
        />
        <span
          aria-hidden="true"
          className="flex h-full shrink-0 items-center border-s border-border-subtle bg-surface-sunken pe-3.5 ps-3 text-sm font-medium text-text-muted"
        >
          {currency}
        </span>
      </div>
      {/* Plain template string, NOT cn(): tailwind-merge would evict `text-caption` next to a text colour (reference_twmerge_text_size_color_footgun). */}
      <p id={noteId} className={`text-caption ${error ? 'text-danger-500' : 'text-text-muted'}`}>
        {error ?? helper}
      </p>
    </div>
  )
}
