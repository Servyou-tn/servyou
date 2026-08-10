'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { isValidPhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { tndPrice } from '@/components/listings/listing-utils'
import { ProductCoverImage } from '@/app/marche/produits/_components/ProductCoverImage'
import { submitProductRequest } from '../actions'
import { Textarea } from './Textarea'
import { NumberStepper } from './NumberStepper'

// E1-product — form + summary, ONE component. Measured from Figma 589:43997 §6c/§6d
// (docs/design/d1-discovery.md). Labels/helpers are founder-screenshot-sourced, not Figma text —
// get_metadata cannot return copy; see the doc's §6 flag.
//
// ⚑ WHY THIS IS ONE COMPONENT, NOT A FORM + A SIBLING SUMMARY (unlike ServiceRequestScreen's
// split). Two reasons, both structural:
//   1. The measured frame draws the CTA (589:44247, 332×48) INSIDE summaryCol, not in formCol —
//      the opposite of E1-service, whose CTA lives in the form's own footer. A `<button
//      type="submit">` works from anywhere inside its owning `<form>` regardless of DOM depth, so
//      the form element has to wrap BOTH columns for the summary's button to actually submit.
//   2. The summary's price rows (Produit ×n / Livraison / Total) are QUANTITY-DERIVED — they must
//      re-render live as the stepper changes. That state can only be shared between two rendered
//      halves if one client component owns both; splitting them the E1-service way would need
//      prop-drilling `quantity` back down through a server boundary, which doesn't exist here.
//
// Layout: `xl:grid xl:grid-cols-[minmax(0,724px)_380px] xl:items-start xl:gap-8` — see
// ProductRequestScreen.tsx for the breakpoint arithmetic. Below `xl:`, single column with the
// order summary FIRST in the DOM (col-start-2/row-start-1 at xl:), form fields second — the exact
// reorder trick E1-service already proved (col-start/row-start), just at a different breakpoint.
//
// ⚑ NO SEPARATE "Annuler" BUTTON. The measured frame lists no cancel/secondary control in either
// column — E1-service's footer row (cancel ⟷ submit) does not exist here. The breadcrumb's own
// title crumb already links back to `/produits/{id}`, which is the same escape hatch a cancel
// link would have been; inventing a second one the frame doesn't draw would be adding chrome, not
// measuring it.
//
// ⚑ NO SEPARATE "Adresse" SUB-HEADING. The frame draws one (`adresseLabel`, 589:44155) but neither
// the founder's screenshot nor a Figma text read named its copy, and the ruling on section
// headings named exactly two: "Coordonnées de livraison" and "Quantité". The address fields flow
// directly under section1's own heading rather than inventing a third label's copy.

const NOTE_MAX = 300

type Errors = {
  fullName?: string
  street?: string
  quartier?: string
  ville?: string
  governorate?: string
  phone?: string
}

export function ProductRequestForm({
  productId,
  title,
  price,
  deliveryFee,
  imageUrl,
  shopName,
  initialPhone,
  tracksStock,
  stockCount,
  lang,
}: {
  productId: string
  title: string
  price: number
  deliveryFee: number
  imageUrl: string | null
  shopName: string
  /** profiles.phone in local form (8 digits), or '' when the buyer has never set one. */
  initialPhone: string
  tracksStock: boolean
  stockCount: number | null
  lang: Lang
}) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState('')
  const [street, setStreet] = React.useState('')
  const [quartier, setQuartier] = React.useState('')
  const [ville, setVille] = React.useState('')
  const [governorate, setGovernorate] = React.useState('')
  const [phone, setPhone] = React.useState(initialPhone)
  const [note, setNote] = React.useState('')
  const [quantity, setQuantity] = React.useState(1)
  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // ⚑ Reachable only via a stale tab or a hand-typed URL — D1's CTA already disables the link to
  // here once a tracked product hits 0. Not defensively re-clamped: the server re-validates
  // authoritatively (`qty > stockCount` rejected in submitProductRequest) regardless of what this
  // control shows.
  const stepperMax = tracksStock ? (stockCount ?? undefined) : undefined

  const subtotal = price * quantity
  const total = subtotal + deliveryFee

  function validate(): Errors {
    const next: Errors = {}
    if (!fullName.trim()) next.fullName = t('demander.error.required', lang)
    if (!street.trim()) next.street = t('demander.error.required', lang)
    if (!quartier.trim()) next.quartier = t('demander.error.required', lang)
    if (!ville.trim()) next.ville = t('demander.error.required', lang)
    if (!governorate) next.governorate = t('demander.error.required', lang)
    if (!isValidPhone(phone)) next.phone = t('demander.error.phoneFormat', lang)
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
    const res = await submitProductRequest({
      productId,
      deliveryName: fullName,
      deliveryStreet: street,
      quartier,
      ville,
      governorate,
      deliveryPhone: phone,
      quantity,
      note,
    })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      return
    }
    // Stay pending through the navigation — the button must not go back to idle on a page that
    // is already being replaced.
    router.push(`/demander/succes?order=${res.orderId}`)
  }

  const selectField = `w-full rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,724px)_380px] xl:items-start xl:gap-8"
    >
      {/* summaryCol — 380 fixed, padding 24, order-summary card. First in the DOM (mobile:
          summary before the form); xl: repositions it to column 2. */}
      <aside className="flex flex-col gap-4 rounded-card border-2 border-brand-blue-600 bg-surface-base p-6 xl:col-start-2 xl:row-start-1">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
            <ProductCoverImage src={imageUrl} alt={title} sizes="64px" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[15px] font-semibold leading-[21px] text-brand-blue-800">
              {title}
            </p>
            <p className="truncate text-body-sm leading-[21px] text-text-muted">{shopName}</p>
          </div>
        </div>

        <div className="h-px bg-border-subtle" aria-hidden="true" />

        {/* ⚑ `dir="ltr"` on every value span — confirmed reversed in the AR verification pass:
            "120 TND" rendered "TND 120" (a digit run followed by Latin letters swaps order under
            RTL, UAX#9 W7/N-rules — the same bug class as D1's gallery counter, just between a
            number and a currency code rather than two numbers). `tndPrice()` is locale-blind by
            design (docs/follow-ups.md — this confirms that gap is an actual bidi defect, not only
            a notation choice); not fixed at the source, which five other surfaces also call — a
            cross-cutting change out of scope here. Fixed locally at every value this PR renders,
            same treatment as ProductRecap in succes/page.tsx. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-body-sm text-text-secondary">
              {t('demander.summary.product', lang, { n: String(quantity) })}
            </span>
            <span dir="ltr" className="text-body-sm font-medium text-text-primary">
              {tndPrice(subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-body-sm text-text-secondary">
              {t('demander.summary.delivery', lang)}
            </span>
            <span dir="ltr" className="text-body-sm font-medium text-text-primary">
              {tndPrice(deliveryFee)}
            </span>
          </div>
          <div className="h-px bg-border-subtle" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold text-text-primary">
              {t('demander.summary.total', lang)}
            </span>
            <span dir="ltr" className="text-base font-semibold text-brand-blue-800">
              {tndPrice(total)}
            </span>
          </div>
        </div>

        <p className="text-caption leading-[18px] text-text-muted">
          {t('demander.subtitle.product', lang)}
        </p>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? t('demander.submit.loading', lang) : t('demander.submit.product', lang)}
        </Button>

        {formError && (
          <p role="alert" className="text-body-sm text-danger-500">
            {formError}
          </p>
        )}
      </aside>

      {/* formCol — 724 max, minmax(0,·) so it shrinks below xl: instead of overflowing. */}
      <div className="flex flex-col gap-5 xl:col-start-1 xl:row-start-1 xl:gap-6">
        <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 xl:p-8">
          <h2 className="text-xl font-semibold text-text-primary">
            {t('demander.section.delivery', lang)}
          </h2>

          <Input
            label={t('demander.field.fullName', lang)}
            placeholder={t('demander.field.fullName_ph', lang)}
            helper={t('demander.field.fullName_helper', lang)}
            error={errors.fullName}
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* +216 prefix — same Input variant=phone pattern as ServiceRequestForm. Different
              helper: a carrier, not a WhatsApp negotiation. */}
          <Input
            label={t('demander.field.phone', lang)}
            placeholder={t('demander.field.phone_ph', lang)}
            helper={t('demander.field.deliveryPhone_helper', lang)}
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

          <Input
            label={t('demander.field.street', lang)}
            placeholder={t('demander.field.street_ph', lang)}
            error={errors.street}
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />

          <Input
            label={t('demander.field.quartier', lang)}
            placeholder={t('demander.field.quartier_ph', lang)}
            error={errors.quartier}
            required
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
          />

          {/* Ville — free text, required. No reference dataset exists for Tunisian villes
              (founder's ruling): filter-cities.ts is the SELLER's shop-city list, a browse-filter
              concept, not a buyer delivery-address one. Gouvernorat stays the canonical Select.
              Reuses ProductForm.tsx's own half-width-pair shape verbatim. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('demander.field.ville', lang)}
              placeholder={t('demander.field.ville_ph', lang)}
              error={errors.ville}
              required
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="product-governorate" className="text-sm font-medium text-text-secondary">
                {t('demander.field.governorate', lang)}
                <span aria-hidden="true" className="text-danger-500"> *</span>
              </label>
              <select
                id="product-governorate"
                aria-required="true"
                aria-invalid={errors.governorate ? true : undefined}
                aria-describedby={errors.governorate ? 'product-governorate-error' : undefined}
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className={`${selectField} ${errors.governorate ? 'border-danger-500' : 'border-border-strong'}`}
              >
                <option value="">{t('demander.field.governorate_ph', lang)}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {lang === 'ar' ? g.ar : g.fr}
                  </option>
                ))}
              </select>
              {errors.governorate && (
                <p id="product-governorate-error" className="text-sm text-danger-500">
                  {errors.governorate}
                </p>
              )}
            </div>
          </div>

          <Textarea
            label={t('demander.field.note', lang)}
            placeholder={t('demander.field.note_ph', lang)}
            counter
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-base p-4 xl:p-8">
          <h2 className="text-xl font-semibold text-text-primary">
            {t('demander.section.quantity', lang)}
          </h2>
          <div className="flex items-center gap-3">
            <NumberStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={stepperMax}
              label={t('demander.field.quantity', lang)}
              decreaseLabel={t('demander.stepper.decrease', lang)}
              increaseLabel={t('demander.stepper.increase', lang)}
            />
            {/* Draws exactly one stock line, matching D1's own resolveStockState philosophy: a
                line only for the TRACKED case. `tracks_stock = false` renders nothing — that IS
                "Toujours disponible", not a state needing its own caption here. */}
            {tracksStock && stockCount != null && (
              <span className="text-body-sm text-text-muted">
                {t('demander.field.available', lang, { n: String(stockCount) })}
              </span>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
