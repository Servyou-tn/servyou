'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import {
  SHOP_TYPES,
  DELIVERY_SETUPS,
  PAYMENT_METHODS,
  shopTypeLabelKey,
  deliverySetupLabelKey,
  paymentMethodLabelKey,
  type ShopType,
  type DeliverySetup,
  type PaymentMethod,
} from '@/lib/types/shop-config'
import { saveShopConfigAction } from '../actions'
import { Stepper } from '../../_components/Stepper'
import { AccordionSection } from './AccordionSection'
import { CheckboxRow, RadioRow } from './FormControls'

// G2 step 2 "Configuration" — Figma 556:37564, measured in docs/design/g2-discovery.md §12-18.
//
// Real Tunisian carriers named by shop owners (§12a's measured caption) — suggestions for a free-
// text field per ruling 2, not an enum: no carriers table exists, and the drawn list matches
// nothing canonical. Brand names, kept identical in FR and AR (same convention as the payment
// method labels — "D17"/"Konnect"/"Flouci" are not translated either).
const CARRIER_SUGGESTIONS = [
  'First Delivery',
  'Aramex',
  'Droppex',
  'Navex',
  'Best Delivery',
  'Intigo',
  'Mes Colis',
  'La Poste (Rapid-Poste)',
  'Livraison personnelle',
  'Autre',
]

export type ConfigurationInitial = {
  shopType: string | null
  deliverySetup: string | null
  workingHours: string
  locationDetail: string
  preferredCarriers: string
  paymentMethods: string[]
  categoryIds: string[]
}

export type ConfigurationCategory = { id: string; name_fr: string; name_ar: string | null }

export function ConfigurationForm({
  categories,
  initial,
}: {
  categories: ConfigurationCategory[]
  initial: ConfigurationInitial
}) {
  const lang = useLang()
  const router = useRouter()

  const [shopType, setShopType] = React.useState<ShopType | ''>((initial.shopType as ShopType) || '')
  const [deliverySetup, setDeliverySetup] = React.useState<DeliverySetup | ''>(
    (initial.deliverySetup as DeliverySetup) || '',
  )
  const [workingHours, setWorkingHours] = React.useState(initial.workingHours)
  const [locationDetail, setLocationDetail] = React.useState(initial.locationDetail)
  const [carrierText, setCarrierText] = React.useState(initial.preferredCarriers)

  // cod is unioned in unconditionally — ruling 3: drawn checked+disabled, cannot be unchecked. It
  // is written on every save regardless of this Set's contents (actions.ts unions it again too).
  const [paymentMethods, setPaymentMethods] = React.useState<Set<PaymentMethod>>(
    () => new Set([...(initial.paymentMethods as PaymentMethod[]), 'cod']),
  )
  const [categoryIds, setCategoryIds] = React.useState<Set<string>>(() => new Set(initial.categoryIds))

  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function togglePaymentMethod(method: PaymentMethod, checked: boolean) {
    if (method === 'cod') return // locked
    setPaymentMethods((prev) => {
      const next = new Set(prev)
      if (checked) next.add(method)
      else next.delete(method)
      return next
    })
  }

  function toggleCategory(id: string, checked: boolean) {
    setCategoryIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // One rule, four sections (g2-discovery.md §16): Complet iff the owner supplied at least one
  // value they actually control. cod isn't owner-controlled, so it never counts toward Complet —
  // paymentMethods.size > 1 is "more than just the locked default", not an arbitrary threshold.
  const typeComplete = Boolean(shopType || workingHours.trim() || locationDetail.trim())
  const livraisonComplete = Boolean(deliverySetup || carrierText.trim())
  const paiementComplete = paymentMethods.size > 1
  const categoriesComplete = categoryIds.size > 0

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    // Which button triggered this submit — read from the DOM submitter, not FormData, same as
    // CreateShopForm.tsx's own `data-intent` pattern (g2-discovery.md §19/§23).
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.dataset.intent === 'create' ? 'create' : 'draft'

    setPending(true)
    setFormError(null)

    const res = await saveShopConfigAction({
      shopType,
      deliverySetup,
      workingHours,
      locationDetail,
      preferredCarriers: carrierText,
      paymentMethods: [...paymentMethods],
      categoryIds: [...categoryIds],
    })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      return
    }

    // Stay pending through the navigation, same as step 1 — the buttons must not flash back to
    // idle on a page that's already being replaced. Only the primary ("Créer ma boutique") submit
    // advances to the success screen — a save-and-defer click is not a completion event
    // (g2-discovery.md §23), so "Enregistrer et continuer plus tard" keeps its original
    // destination.
    router.push(intent === 'create' ? '/ma-boutique/creer/succes' : '/tableau-de-bord-vendeur')
  }

  const selectField = `w-full rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 border-border-strong ${FOCUS_RING}`

  return (
    <form
      id="configuration-form"
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-[760px] flex-col gap-6"
    >
      <div className="flex flex-col gap-6">
        <div>
          <nav aria-label="Fil d'Ariane" className="mb-3">
            <ol className="flex items-center gap-1.5 text-sm text-text-muted">
              <li>
                <Link href="/devenir-vendeur" className={`rounded ${FOCUS_RING}`}>
                  {t('shop.create.crumb_devenir', lang)}
                </Link>
              </li>
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </li>
              <li aria-current="page" className="font-medium text-text-primary">
                {t('shop.create.crumb_current', lang)}
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold text-text-primary">{t('shop.create.page_title', lang)}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{t('shop.create.page_subtitle', lang)}</p>
        </div>

        <Stepper
          steps={[
            { label: t('shop.create.step1_label', lang), state: 'done' },
            { label: t('shop.create.step2_label', lang), state: 'active' },
          ]}
        />
      </div>

      <div className="flex flex-col rounded-card border border-border-subtle bg-surface-base p-4 sm:p-6">
        <p className="text-sm text-text-muted">{t('boutique.config.box_subline', lang)}</p>

        <div className="mt-4 flex flex-col gap-6">
          {/* Type de boutique — acc-type. Horaires/Adresse grouped here too (g2-discovery.md §14):
              Figma drew no body for this section, and these two fields have no other home. */}
          <AccordionSection title={t('boutique.field_shop_type', lang)} complete={typeComplete}>
            <div className="flex flex-col gap-2">
              <label htmlFor="shop-type" className="text-sm font-medium text-text-secondary">
                {t('boutique.field_shop_type', lang)}
              </label>
              <select
                id="shop-type"
                value={shopType}
                onChange={(e) => setShopType(e.target.value as ShopType | '')}
                className={selectField}
              >
                <option value="">{t('boutique.placeholder_shop_type', lang)}</option>
                {SHOP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(shopTypeLabelKey(type), lang)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="shop-working-hours"
              label={t('boutique.field_working_hours', lang)}
              placeholder={t('boutique.hint_working_hours', lang)}
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />

            <Input
              id="shop-location-detail"
              label={t('boutique.field_location_detail', lang)}
              placeholder={t('boutique.hint_location_detail', lang)}
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
            />
          </AccordionSection>

          {/* Livraison — acc-livraison (measured). */}
          <AccordionSection title={t('boutique.config.section_livraison', lang)} complete={livraisonComplete}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">{t('boutique.field_delivery_setup', lang)}</span>
              <div className="flex flex-col">
                {DELIVERY_SETUPS.map((setup) => (
                  <RadioRow
                    key={setup}
                    id={`delivery-setup-${setup}`}
                    name="delivery-setup"
                    label={t(deliverySetupLabelKey(setup), lang)}
                    checked={deliverySetup === setup}
                    onChange={() => setDeliverySetup(setup)}
                  />
                ))}
              </div>
            </div>

            <div>
              <Input
                id="shop-carriers"
                list="carrier-suggestions"
                label={t('boutique.field_preferred_carriers', lang)}
                placeholder={t('boutique.hint_preferred_carriers', lang)}
                value={carrierText}
                onChange={(e) => setCarrierText(e.target.value)}
              />
              <datalist id="carrier-suggestions">
                {CARRIER_SUGGESTIONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </AccordionSection>

          {/* Moyens de paiement — acc-paiement (measured). */}
          <AccordionSection title={t('boutique.config.section_paiement', lang)} complete={paiementComplete}>
            <p className="text-sm text-text-muted">{t('boutique.config.cod_note', lang)}</p>
            <div className="flex flex-col">
              {PAYMENT_METHODS.map((method) => (
                <CheckboxRow
                  key={method}
                  id={`payment-method-${method}`}
                  label={t(paymentMethodLabelKey(method), lang)}
                  checked={paymentMethods.has(method)}
                  disabled={method === 'cod'}
                  onChange={(checked) => togglePaymentMethod(method, checked)}
                  caption={method === 'cod' ? t('boutique.config.cod_locked', lang) : undefined}
                />
              ))}
            </div>
          </AccordionSection>

          {/* Catégories de la boutique — acc-categories. */}
          <AccordionSection title={t('boutique.config.section_categories', lang)} complete={categoriesComplete}>
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {categories.map((category) => (
                <CheckboxRow
                  key={category.id}
                  id={`category-${category.id}`}
                  label={(lang === 'ar' ? category.name_ar : category.name_fr) || category.name_fr}
                  checked={categoryIds.has(category.id)}
                  onChange={(checked) => toggleCategory(category.id, checked)}
                />
              ))}
            </div>
          </AccordionSection>
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      {/* Footer inherited from step 1's own measured record, not re-measured this pass
          (g2-discovery.md §13) — secondary start, primary end, same flex-col-reverse/sm:flex-row
          mobile-stack rule. */}
      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="secondary" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('shop.create.saving', lang) : t('shop.create.save_draft', lang)}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          data-intent="create"
          className="w-full sm:w-auto"
        >
          {pending ? t('shop.create.saving', lang) : t('boutique.action_create', lang)}
        </Button>
      </div>
    </form>
  )
}
