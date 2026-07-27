'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { isValidPhone } from '@/lib/phone'
import { submitServiceRequest } from '../actions'
import { Textarea } from './Textarea'

// E1 MAIN — the form card, measured from Figma 680:56165 (empty) / 682:56521 (filled) /
// 682:56805 (mobile). Client because it owns four controlled fields, inline validation and the
// submit lifecycle; everything static around it (breadcrumb, summary panel) stays server-rendered.
//
// Layout note: on desktop the card border wraps section + note + actions (MAIN, pad 32, gap 24).
// On mobile 682:56805 the card wraps ONLY the fields — the COD note and the buttons are siblings
// below it at the page's 20 gap. Rather than render either twice, the border lives on the inner
// wrapper at base and moves to the <form> at lg, which is the same trick D2 uses for its buy box.
//
// Validation is duplicated on purpose, not defensively: these checks are UX (inline, on submit)
// and the server action re-runs the real ones. The floors match — 20 chars, a valid TN phone —
// so a client-side pass cannot produce a server-side reject the user can't see.

const MAX_DESCRIPTION = 500
const MIN_DESCRIPTION = 20

type Errors = { description?: string; budget?: string; phone?: string }

export function ServiceRequestForm({
  serviceId,
  briefing,
  initialPhone,
  lang,
}: {
  serviceId: string
  /** service_listings.buyer_briefing — the seller's template. Rendered as guidance, never editable. */
  briefing: string | null
  /** profiles.phone in local form (8 digits), or '' when the buyer has never set one. */
  initialPhone: string
  lang: Lang
}) {
  const router = useRouter()
  const [description, setDescription] = React.useState('')
  const [timeframe, setTimeframe] = React.useState('')
  const [budget, setBudget] = React.useState('')
  const [phone, setPhone] = React.useState(initialPhone)
  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function validate(): Errors {
    const next: Errors = {}
    if (description.trim().length < MIN_DESCRIPTION) {
      next.description = t('demander.error.minLength', lang, { n: MIN_DESCRIPTION })
    }
    // Optional field: only a value that IS present and is not a non-negative number is an
    // error. noValidate means min={0} does not block a typed "-5", so this is the real gate.
    if (budget.trim() && !(Number(budget) >= 0)) {
      next.budget = t('demander.error.amount', lang)
    }
    if (!isValidPhone(phone)) {
      next.phone = t('demander.error.phoneFormat', lang)
    }
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormError(t('demander.toast.error', lang))
      return
    }

    setPending(true)
    setFormError(null)
    const res = await submitServiceRequest({ serviceId, description, timeframe, budget, phone })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      return
    }
    // Stay pending through the navigation — the button must not go back to idle on a page
    // that is already being replaced.
    router.push(`/demander/succes?order=${res.orderId}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 lg:gap-6 lg:rounded-card lg:border lg:border-border-subtle lg:bg-surface-base lg:p-8"
    >
      <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
        <h2 className="text-xl font-semibold text-text-primary">{t('demander.service.heading', lang)}</h2>

        {/* Seller's briefing template. Guidance, not an input — 20 of 21 listings have none,
            so the absent case is the default and the block simply does not render. */}
        {briefing && (
          <section className="flex flex-col gap-2 rounded-card bg-brand-blue-50 p-4">
            <h3 className="flex items-center gap-2 text-body-sm font-semibold text-brand-blue-800">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('demander.service.briefing', lang)}
            </h3>
            <p className="whitespace-pre-line text-body-sm leading-relaxed text-brand-blue-700">{briefing}</p>
          </section>
        )}

        <Textarea
          label={t('demander.field.description', lang)}
          placeholder={t('demander.field.description_ph', lang)}
          helper={t('demander.field.description_helper', lang)}
          error={errors.description}
          required
          counter
          maxLength={MAX_DESCRIPTION}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label={t('demander.field.timeframe', lang)}
          placeholder={t('demander.field.timeframe_ph', lang)}
          helper={t('demander.field.optional', lang)}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        />

        {/* Budget — Price Input 202:15460: label 14 Semi Bold, 44 field, and a tinted TND box
            flush to the field's end. Not the Input primitive: that suffix is a full-height
            surface with its own border, which an inline iconEnd inside px-4 cannot reproduce. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget" className="text-sm font-semibold text-text-secondary">
            {t('demander.field.budget', lang)}
          </label>
          <div
            className={`flex h-11 items-center overflow-hidden rounded-lg border bg-surface-base ${
              errors.budget ? 'border-danger-500' : 'border-border-strong'
            } focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 focus-within:ring-offset-surface-base`}
          >
            <input
              id="budget"
              name="budget"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              dir="ltr"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              aria-describedby="budget-helper"
              aria-invalid={errors.budget ? true : undefined}
              className="h-full w-full min-w-0 bg-transparent px-4 text-base text-text-primary outline-none placeholder:text-text-muted"
            />
            <span
              aria-hidden="true"
              className="flex h-full shrink-0 items-center border-s border-border-subtle bg-surface-sunken pe-3.5 ps-3 text-sm font-medium text-text-muted"
            >
              TND
            </span>
          </div>
          {/* Error replaces the helper, as in Input/Textarea. */}
          <p
            id="budget-helper"
            className={errors.budget ? 'text-caption text-danger-500' : 'text-caption text-text-muted'}
          >
            {errors.budget ?? t('demander.field.budgetHint', lang)}
          </p>
        </div>

        {/* Phone — Input variant=phone 22:651: a static +216 with a 1px divider inside the field,
            so the buyer types the 8 local digits. Prefilled from the profile, editable: the
            override is stored on the order, never written back to profiles. */}
        <Input
          label={t('demander.field.phone', lang)}
          placeholder={t('demander.field.phone_ph', lang)}
          helper={t('demander.field.phone_helper', lang)}
          error={errors.phone}
          required
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          iconStart={
            <span className="flex shrink-0 items-center gap-2 text-base text-text-secondary">
              +216
              <span aria-hidden="true" className="h-5 w-px bg-border-subtle" />
            </span>
          }
        />
      </div>

      <p className="text-caption leading-[18px] text-text-muted">{t('demander.service.codNote', lang)}</p>

      {formError && (
        <p role="alert" className="text-body-sm text-danger-500">
          {formError}
        </p>
      )}

      {/* Desktop: secondary ⟷ primary, SPACE_BETWEEN. Mobile 682:56914: stacked full-width with
          the primary FIRST — the thumb-reachable order, not the desktop reading order. */}
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href={`/services/${serviceId}`}
          className={`inline-flex h-10 items-center justify-center rounded-lg border border-border-strong bg-surface-base px-4 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
        >
          {t('demander.cancel', lang)}
        </Link>
        <Button type="submit" size="lg" loading={pending}>
          {pending ? t('demander.submit.loading', lang) : t('demander.submit.service', lang)}
        </Button>
      </div>
    </form>
  )
}
