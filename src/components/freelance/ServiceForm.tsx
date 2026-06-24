'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
}

// Shared create/edit form for a service listing. Mirrors MissionForm's field/label/error styling.
// Client validation (validateServiceInput) shows per-field inline errors; the server action
// re-validates and returns a single errorKey for any server-level failure (shown top-of-form). On
// success it returns (doesn't redirect), so the form shows a Sonner toast and navigates to the list.
const LIST_HREF = '/mon-profil-freelance/services'

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField, string>>>({})

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [startingPrice, setStartingPrice] = useState(initialValues?.startingPrice ?? '')
  const [deliveryTime, setDeliveryTime] = useState(initialValues?.deliveryTime ?? '')
  const [status, setStatus] = useState(initialValues?.status === 'hidden' ? 'hidden' : 'active')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const input = { title, categoryId, description, startingPrice, deliveryTime, status }
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

  const field = `w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-accent ${FOCUS_RING}`
  const label = 'mb-1.5 block text-sm font-medium text-text-primary'
  const helperCls = 'mt-1 text-xs text-text-muted'
  const errorCls = 'mt-1 text-xs text-red-600'

  // Helper/error row under a field: the inline error replaces the helper when present.
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
            aria-describedby={fieldErrors.category ? 'svc-category-err' : undefined}
            className={field}
          >
            <option value="">{t('freelance.services.form.category.placeholder', lang)}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'ar' ? c.name_ar : c.name_fr}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p id="svc-category-err" className={errorCls}>
              {t(fieldErrors.category, lang)}
            </p>
          )}
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
            aria-describedby={fieldErrors.description ? 'svc-description-err' : 'svc-description-help'}
            className={`${field} resize-y`}
          />
          {note('svc-description', fieldErrors.description, 'freelance.services.form.description.helper')}
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
              aria-describedby={fieldErrors.price ? 'svc-price-err' : 'svc-price-help'}
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
              aria-describedby={fieldErrors.delivery ? 'svc-delivery-err' : 'svc-delivery-help'}
              className={field}
            />
            {note('svc-delivery', fieldErrors.delivery, 'freelance.services.form.delivery.helper')}
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
