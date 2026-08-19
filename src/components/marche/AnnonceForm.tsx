'use client'

import { useState, useTransition, useId } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { FOCUS_RING, CARD_SHADOW, SELECT_FIELD_BASE } from '@/components/layout/styles'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/tag-input'
import { Button } from '@/components/ui/button'
import { createAnnonce } from '@/app/mes-annonces/nouvelle/actions'
import { ANNONCE_SKILLS_MAX } from '@/lib/marche/job-post-validation'

// PR-D — rebuilt on the design system, measured to be visually indistinguishable in identity
// from G6 "Ajouter un produit" and E1 "Demander". Card/section shape borrows G6's (single
// rounded-2xl/bg-white/CARD_SHADOW section, since this form — unlike G6's four — only needs one);
// the two-tier validation pattern (per-field Errors + a whole-form banner), the Textarea and
// Price Input composite, and the Button/Cancel-link footer all borrow E1's.
//
// FIELD MARKING — locked HYBRID rule for a majority-required form: required fields carry NO
// asterisk, optional fields carry "(optionnel)" in the label text (already true of every label
// below — see fr.ts/ar.ts's existing budget_label/deadline_label/skills_label copy). Category and
// Ville are native <select>s with `aria-required` wired by hand, so they get the rule cleanly.
// Title (Input) and Description (Textarea) do NOT — those primitives' single `required` boolean
// couples the visual asterisk to `aria-required` with no way to decouple one from the other, so
// asking for "no asterisk, but still aria-required" is not expressible today. Reported rather than
// hacked around (an aria-required passed through props is silently clobbered by Input/Textarea's
// own `aria-required={required || undefined}`, confirmed by reading both primitives — it cannot be
// slipped through): docs/follow-ups.md logs the gap and the additive-prop fix it wants
// (`hideRequiredMarker`, or splitting `required`/`ariaRequired` into two props). Title/Description
// ship with neither asterisk nor aria-required under this interim — not a regression (the form
// they replace had neither either), just not yet the full rule.

type Errors = {
  title?: string
  description?: string
  category?: string
  city?: string
  budgetMin?: string
  budgetMax?: string
  deadline?: string
}

export function AnnonceForm({ categories }: { categories: { id: string; name_fr: string }[] }) {
  const lang = useLang()
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [isRemote, setIsRemote] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [skills, setSkills] = useState<string[]>([])

  // Validation is duplicated on purpose, not defensively — same posture as E1
  // (ServiceRequestForm.tsx): these are UX checks and job-post-validation.ts's validateJobPost
  // re-runs the real ones server-side. The floors match, so a client-side pass cannot produce a
  // server-side reject the user never saw coming.
  function validate(): Errors {
    const next: Errors = {}
    if (!title.trim()) next.title = t('annonce.error.title_required', lang)
    if (!description.trim()) next.description = t('annonce.error.description_required', lang)
    if (!categoryId) next.category = t('annonce.error.category_required', lang)
    if (!city) next.city = t('annonce.error.city_required', lang)

    const minRaw = budgetMin.trim()
    const maxRaw = budgetMax.trim()
    const minNum = minRaw ? Number(minRaw) : null
    const maxNum = maxRaw ? Number(maxRaw) : null
    const minInvalid = minRaw !== '' && !(Number.isFinite(minNum) && (minNum as number) >= 0)
    const maxInvalid = maxRaw !== '' && !(Number.isFinite(maxNum) && (maxNum as number) >= 0)
    if (minInvalid) next.budgetMin = t('annonce.error.budget_invalid', lang)
    if (maxInvalid) next.budgetMax = t('annonce.error.budget_invalid', lang)
    // Cross-field (min > max) attaches to budgetMax — the field a user would actually edit to fix
    // it — rather than the whole-form banner, which is reserved for whole-form/server failures.
    if (!minInvalid && !maxInvalid && minNum != null && maxNum != null && minNum > maxNum) {
      next.budgetMax = t('annonce.error.budget_order', lang)
    }

    if (deadline.trim()) {
      const [y, m, d] = deadline.trim().split('-').map(Number)
      const chosen = new Date(y, (m ?? 1) - 1, d ?? 1)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (Number.isNaN(chosen.getTime()) || chosen < today) {
        next.deadline = t('annonce.error.deadline_past', lang)
      }
    }

    return next
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormError(t('annonce.form.fix_errors', lang))
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await createAnnonce({
        title,
        description,
        categoryId,
        city,
        budgetMin,
        budgetMax,
        isRemote,
        deadline,
        skills,
      })
      // Success redirects server-side (never returns here); only failures resolve.
      if (res && !res.ok) setFormError(t(res.errorKey, lang))
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-[760px]">
      <div className={`space-y-5 rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
        <Input
          id="annonce-title"
          label={t('annonce.form.title_label', lang)}
          placeholder={t('annonce.form.title_ph', lang)}
          error={errors.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          id="annonce-description"
          label={t('annonce.form.description_label', lang)}
          placeholder={t('annonce.form.description_ph', lang)}
          error={errors.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TagInput
          value={skills}
          onChange={setSkills}
          max={ANNONCE_SKILLS_MAX}
          label={t('annonce.form.skills_label', lang)}
          placeholder={t('annonce.form.skills_ph', lang)}
          helper={t('annonce.form.skills_helper', lang)}
          getRemoveLabel={(skill) => t('annonce.form.skills_remove', lang, { name: skill })}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="annonce-category" className="text-sm font-medium text-text-secondary">
              {t('annonce.form.category_label', lang)}
            </label>
            <select
              id="annonce-category"
              aria-required="true"
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={errors.category ? 'annonce-category-error' : undefined}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${SELECT_FIELD_BASE} ${errors.category ? 'border-danger-500' : 'border-border-strong'}`}
            >
              <option value="">{t('annonce.form.category_ph', lang)}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_fr}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="annonce-category-error" className="text-sm text-danger-500">
                {errors.category}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="annonce-city" className="text-sm font-medium text-text-secondary">
              {t('annonce.form.city_label', lang)}
            </label>
            <select
              id="annonce-city"
              aria-required="true"
              aria-invalid={errors.city ? true : undefined}
              aria-describedby={errors.city ? 'annonce-city-error' : undefined}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${SELECT_FIELD_BASE} ${errors.city ? 'border-danger-500' : 'border-border-strong'}`}
            >
              <option value="">{t('annonce.form.city_ph', lang)}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {lang === 'ar' ? g.ar : g.fr}
                </option>
              ))}
            </select>
            {errors.city && (
              <p id="annonce-city-error" className="text-sm text-danger-500">
                {errors.city}
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('annonce.form.budget_label', lang)}
          </span>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PriceField
              ariaLabel={t('annonce.form.budget_min_ph', lang)}
              placeholder={t('annonce.form.budget_min_ph', lang)}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              error={errors.budgetMin}
            />
            <PriceField
              ariaLabel={t('annonce.form.budget_max_ph', lang)}
              placeholder={t('annonce.form.budget_max_ph', lang)}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              error={errors.budgetMax}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="annonce-deadline" className="text-sm font-medium text-text-secondary">
              {t('annonce.form.deadline_label', lang)}
            </label>
            {/* Native date input, styled — no DS DatePicker exists (task out of scope). Chromium
                renders its built-in picker/placeholder in the OS locale regardless of `lang`
                (mm/dd/yyyy under an en-US host locale even on the AR page) — logged in
                docs/follow-ups.md; SignupForm.tsx's own `type="date"` field has it identically. */}
            <input
              id="annonce-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-invalid={errors.deadline ? true : undefined}
              aria-describedby={errors.deadline ? 'annonce-deadline-error' : undefined}
              className={`${SELECT_FIELD_BASE} ${errors.deadline ? 'border-danger-500' : 'border-border-strong'}`}
            />
            {errors.deadline && (
              <p id="annonce-deadline-error" className="text-sm text-danger-500">
                {errors.deadline}
              </p>
            )}
          </div>

          <div className="flex sm:items-end">
            <CheckboxRow
              id="annonce-remote"
              label={t('annonce.form.remote_label', lang)}
              checked={isRemote}
              onChange={setIsRemote}
            />
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/mes-annonces"
            className={`inline-flex h-10 items-center justify-center rounded-lg border border-border-strong bg-surface-base px-4 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
          >
            {t('annonce.form.cancel', lang)}
          </Link>
          <Button type="submit" size="lg" loading={pending}>
            {pending ? t('annonce.form.submitting', lang) : t('annonce.form.submit', lang)}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Price Input — E1's composite (ServiceRequestForm.tsx's budget field), copied rather than
// promoted (not asked for; task 3 only names the two Textarea/TagInput promotions). A local
// sub-component rather than inline JSX: two instances render side by side (min/max), and E1's
// original hardcodes `id="budget"` — copied inline twice would collide on that id and its
// `aria-describedby` target, breaking label association invisibly (no screenshot catches a
// duplicate DOM id). useId() gives each instance its own.
function PriceField({
  ariaLabel,
  placeholder,
  value,
  onChange,
  error,
}: {
  ariaLabel: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
}) {
  const reactId = useId()
  const fieldId = `${reactId}-price`
  const errorId = `${reactId}-price-error`
  return (
    <div className="flex flex-col gap-1.5">
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
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-full w-full min-w-0 bg-transparent px-4 text-base text-text-primary outline-none placeholder:text-text-muted"
        />
        <span
          aria-hidden="true"
          className="flex h-full shrink-0 items-center border-s border-border-subtle bg-surface-sunken pe-3.5 ps-3 text-sm font-medium text-text-muted"
        >
          TND
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-caption text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}

// Checkbox — copied verbatim from
// ma-boutique/creer/configuration/_components/FormControls.tsx's `CheckboxRow` (G2), not
// imported: that file lives under a different route's `_components` folder, which the Next.js App
// Router treats as private to that route. If this drifts from the source, check there first.
function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 shrink-0 rounded border-border-strong accent-brand-blue-600 ${FOCUS_RING}`}
      />
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  )
}
