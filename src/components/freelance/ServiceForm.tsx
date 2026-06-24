'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { validateServiceInput, type ServiceField } from '@/lib/freelance/service-validation'
import { createService, updateService } from '@/app/mon-profil-freelance/services/actions'

type Category = { id: string; name_fr: string; name_ar: string }

export type ServiceFormValues = {
  title: string
  categoryId: string
  description: string
  startingPrice: string
  deliveryTime: string
  status: string
  deliverables: string[]
  revisions: string
  tags: string[]
  buyerBriefing: string
}

const LIST_HREF = '/mon-profil-freelance/services'
const TAG_RE = /^[a-z0-9-]{2,30}$/
const DELIVERABLES_MIN_ROWS = 3
const DELIVERABLES_MAX = 8
const TAGS_MAX = 5
const BRIEFING_MAX = 1000

// Seed the deliverables rows: existing non-empty entries, padded to the 3-row minimum.
function seedDeliverables(initial?: string[]): string[] {
  const rows = (initial ?? []).filter((d) => d.length > 0)
  while (rows.length < DELIVERABLES_MIN_ROWS) rows.push('')
  return rows
}

// Shared create/edit form for a service listing. Mirrors MissionForm's field/label/error styling.
// Client validation (validateServiceInput) shows per-field inline errors; the server action
// re-validates and returns a single errorKey for any server-level failure. On success it returns
// (doesn't redirect), so the form shows a Sonner toast and navigates to the list.
export function ServiceForm({
  mode,
  categories,
  serviceId,
  initialValues,
}: {
  mode: 'create' | 'edit'
  categories: Category[]
  serviceId?: string
  initialValues?: ServiceFormValues
}) {
  const lang = useLang()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  // On edit, surface the "min required" nudge for backfilled rows (0 deliverables / 0 tags)
  // immediately on load — not on first submit. The submit button stays enabled.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField, string>>>(() => {
    const e: Partial<Record<ServiceField, string>> = {}
    if (mode === 'edit') {
      if ((initialValues?.deliverables ?? []).filter(Boolean).length < 3)
        e.deliverables = 'freelance.services.form.deliverables.errors.min'
      if ((initialValues?.tags ?? []).length < 3) e.tags = 'freelance.services.form.tags.errors.min'
    }
    return e
  })

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [startingPrice, setStartingPrice] = useState(initialValues?.startingPrice ?? '')
  const [deliveryTime, setDeliveryTime] = useState(initialValues?.deliveryTime ?? '')
  const [status, setStatus] = useState(initialValues?.status === 'hidden' ? 'hidden' : 'active')
  const [deliverables, setDeliverables] = useState<string[]>(() => seedDeliverables(initialValues?.deliverables))
  const [revisions, setRevisions] = useState<number>(() => {
    const n = Number.parseInt(initialValues?.revisions ?? '', 10)
    return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 1
  })
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [buyerBriefing, setBuyerBriefing] = useState(initialValues?.buyerBriefing ?? '')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const input = {
      title,
      categoryId,
      description,
      startingPrice,
      deliveryTime,
      status,
      deliverables,
      revisions: String(revisions),
      tags,
      buyerBriefing,
    }
    const v = validateServiceInput(input)
    if (!v.ok) {
      setFieldErrors(v.errors)
      return
    }
    setFieldErrors({})

    startTransition(async () => {
      const res =
        mode === 'edit' && serviceId
          ? await updateService(serviceId, input)
          : await createService(input)
      if (res.ok) {
        toast.success(
          t(
            mode === 'edit'
              ? 'freelance.services.form.success.updated'
              : 'freelance.services.form.success.created',
            lang,
          ),
        )
        router.push(LIST_HREF)
        router.refresh()
      } else {
        setFormError(t(res.errorKey, lang))
      }
    })
  }

  // ── Deliverables handlers ──
  const setDeliverableAt = (i: number, val: string) =>
    setDeliverables((d) => d.map((x, idx) => (idx === i ? val : x)))
  const addDeliverable = () =>
    setDeliverables((d) => (d.length < DELIVERABLES_MAX ? [...d, ''] : d))
  const removeDeliverable = (i: number) =>
    setDeliverables((d) => (d.length > DELIVERABLES_MIN_ROWS ? d.filter((_, idx) => idx !== i) : d))

  // ── Tags handlers ──
  function commitTag() {
    const raw = tagInput.trim().toLowerCase()
    setTagInput('')
    if (!raw) return
    if (!TAG_RE.test(raw)) {
      setTagError('freelance.services.form.tags.errors.format')
      return
    }
    if (tags.includes(raw)) return
    if (tags.length >= TAGS_MAX) {
      setTagError('freelance.services.form.tags.errors.max')
      return
    }
    setTags((tg) => [...tg, raw])
    setTagError(null)
  }
  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTag()
    }
  }
  const removeTag = (tag: string) => setTags((tg) => tg.filter((x) => x !== tag))

  const field = `w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-accent ${FOCUS_RING}`
  const label = 'mb-1.5 block text-sm font-medium text-text-primary'
  const helperCls = 'mt-1 text-xs text-text-muted'
  const errorCls = 'mt-1 text-xs text-red-600'

  const note = (id: string, errKey: string | undefined, helperKey: string) =>
    errKey ? (
      <p id={`${id}-err`} className={errorCls}>
        {t(errKey, lang)}
      </p>
    ) : (
      <p id={`${id}-help`} className={helperCls}>
        {t(helperKey, lang)}
      </p>
    )

  const tagsErrKey = tagError ?? fieldErrors.tags

  return (
    <form onSubmit={onSubmit} className={`max-w-2xl rounded-2xl bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
      <div className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="svc-title" className={label}>
            {t('freelance.services.form.title.label', lang)}
          </label>
          <input
            id="svc-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'svc-title-err' : 'svc-title-help'}
            className={field}
          />
          {note('svc-title', fieldErrors.title, 'freelance.services.form.title.helper')}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="svc-category" className={label}>
            {t('freelance.services.form.category.label', lang)}
          </label>
          <select
            id="svc-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-invalid={Boolean(fieldErrors.category)}
            className={field}
          >
            <option value="">{t('freelance.services.form.category.placeholder', lang)}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'ar' ? c.name_ar : c.name_fr}
              </option>
            ))}
          </select>
          {fieldErrors.category && <p className={errorCls}>{t(fieldErrors.category, lang)}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="svc-description" className={label}>
            {t('freelance.services.form.description.label', lang)}
          </label>
          <textarea
            id="svc-description"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            className={`${field} resize-y`}
          />
          {note('svc-description', fieldErrors.description, 'freelance.services.form.description.helper')}
        </div>

        {/* Deliverables — repeatable rows */}
        <div>
          <span className={label}>{t('freelance.services.form.deliverables.label', lang)}</span>
          <div className="space-y-2">
            {deliverables.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                <input
                  type="text"
                  maxLength={150}
                  value={d}
                  onChange={(e) => setDeliverableAt(i, e.target.value)}
                  aria-label={`${t('freelance.services.form.deliverables.label', lang)} ${i + 1}`}
                  placeholder={t('freelance.services.form.deliverables.placeholder', lang)}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => removeDeliverable(i)}
                  disabled={deliverables.length <= DELIVERABLES_MIN_ROWS}
                  aria-label={t('freelance.services.form.deliverables.remove', lang)}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-slate-100 disabled:opacity-30 ${FOCUS_RING}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={addDeliverable}
              disabled={deliverables.length >= DELIVERABLES_MAX}
              className={`inline-flex items-center gap-1 rounded-full text-sm font-medium text-brand-accent transition-colors hover:text-brand-primary disabled:opacity-40 ${FOCUS_RING}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('freelance.services.form.deliverables.add', lang)}
            </button>
          </div>
          {fieldErrors.deliverables ? (
            <p className={errorCls}>{t(fieldErrors.deliverables, lang)}</p>
          ) : (
            <p className={helperCls}>{t('freelance.services.form.deliverables.helper', lang)}</p>
          )}
        </div>

        {/* Revisions — stepper */}
        <div>
          <span className={label}>{t('freelance.services.form.revisions.label', lang)}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRevisions((r) => Math.max(0, r - 1))}
              disabled={revisions <= 0}
              aria-label="Diminuer le nombre de révisions"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-40 ${FOCUS_RING}`}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="min-w-8 text-center text-base font-semibold text-text-primary">
              {revisions}
            </span>
            <button
              type="button"
              onClick={() => setRevisions((r) => Math.min(10, r + 1))}
              disabled={revisions >= 10}
              aria-label="Augmenter le nombre de révisions"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-40 ${FOCUS_RING}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {fieldErrors.revisions ? (
            <p className={errorCls}>{t(fieldErrors.revisions, lang)}</p>
          ) : (
            <p className={helperCls}>{t('freelance.services.form.revisions.helper', lang)}</p>
          )}
        </div>

        {/* Price + Delivery time */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="svc-price" className={label}>
              {t('freelance.services.form.price.label', lang)}
            </label>
            <input
              id="svc-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              aria-invalid={Boolean(fieldErrors.price)}
              className={field}
            />
            {note('svc-price', fieldErrors.price, 'freelance.services.form.price.helper')}
          </div>

          <div>
            <label htmlFor="svc-delivery" className={label}>
              {t('freelance.services.form.delivery.label', lang)}
            </label>
            <input
              id="svc-delivery"
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              placeholder={t('freelance.services.form.delivery.placeholder', lang)}
              aria-invalid={Boolean(fieldErrors.delivery)}
              className={field}
            />
            {note('svc-delivery', fieldErrors.delivery, 'freelance.services.form.delivery.helper')}
          </div>
        </div>

        {/* Tags — chip input */}
        <div>
          <label htmlFor="svc-tags" className={label}>
            {t('freelance.services.form.tags.label', lang)}
          </label>
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Retirer ${tag}`}
                    className={`rounded-full text-blue-700 hover:text-blue-900 ${FOCUS_RING}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="svc-tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={commitTag}
            placeholder={t('freelance.services.form.tags.placeholder', lang)}
            aria-invalid={Boolean(tagsErrKey)}
            className={field}
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            {tagsErrKey ? (
              <p className={errorCls}>{t(tagsErrKey, lang)}</p>
            ) : (
              <p className={helperCls}>{t('freelance.services.form.tags.helper', lang)}</p>
            )}
            <span className="shrink-0 text-xs text-text-muted">
              {t('freelance.services.form.tags.counter', lang, { count: tags.length })}
            </span>
          </div>
        </div>

        {/* Buyer briefing — optional textarea + counter */}
        <div>
          <label htmlFor="svc-briefing" className={label}>
            {t('freelance.services.form.briefing.label', lang)}
          </label>
          <textarea
            id="svc-briefing"
            rows={5}
            maxLength={BRIEFING_MAX}
            value={buyerBriefing}
            onChange={(e) => setBuyerBriefing(e.target.value)}
            placeholder={t('freelance.services.form.briefing.placeholder', lang)}
            aria-invalid={Boolean(fieldErrors.briefing)}
            className={`${field} resize-y`}
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            {fieldErrors.briefing ? (
              <p className={errorCls}>{t(fieldErrors.briefing, lang)}</p>
            ) : (
              <p className={helperCls}>{t('freelance.services.form.briefing.helper', lang)}</p>
            )}
            <span className="shrink-0 text-xs text-text-muted">
              {t('freelance.services.form.briefing.counter', lang, { count: buyerBriefing.length })}
            </span>
          </div>
        </div>

        {/* Status (visibility) */}
        <fieldset>
          <legend className={label}>{t('freelance.services.form.status.label', lang)}</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="svc-status"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className={`h-4 w-4 ${FOCUS_RING}`}
              />
              {t('freelance.services.card.status.active', lang)}
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="svc-status"
                value="hidden"
                checked={status === 'hidden'}
                onChange={() => setStatus('hidden')}
                className={`h-4 w-4 ${FOCUS_RING}`}
              />
              {t('freelance.services.card.status.hidden', lang)}
            </label>
          </div>
          <p className={helperCls}>{t('freelance.services.form.status.helper', lang)}</p>
        </fieldset>

        {formError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className={`inline-flex items-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light disabled:opacity-60 ${FOCUS_RING}`}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t(
              mode === 'edit'
                ? 'freelance.services.form.submit.edit'
                : 'freelance.services.form.submit.create',
              lang,
            )}
          </button>
          <a
            href={LIST_HREF}
            className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
          >
            {t('freelance.services.form.cancel', lang)}
          </a>
        </div>
      </div>
    </form>
  )
}
