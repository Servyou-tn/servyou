'use client'

import { Input } from '@/components/ui/input'
import { t, type Lang } from '@/lib/i18n'
import { DRAFT_LIMITS, PRICE_UNITS, type DraftForm, type FieldError, type Step3Field } from '@/lib/freelance/service-draft'
import { SegmentedRadio } from './SegmentedRadio'

// H6 step 3 « Tarif » — Figma 459:18966 card `box` (docs/design/h6-measurements.md, read 3); rulings
// in docs/design/h6-pr3-deltas.md:
//   • Prix de départ — F3 Input + the flush « TND » suffix (Price Input 202:15487, D18). Typed as text
//     with a decimal keypad (FR users type « 800,50 »), kept LTR in Arabic; parsed at save / gate time.
//     The frame draws a filled value and no placeholder, so none is shown. Writes starting_price_tnd.
//   • Unité — 4 equal segments (D19), « Par mois » in place of the frame's « Par projet » (D13, a
//     founder-approved deviation). Writes price_unit.
//   • Délai de réalisation estimé — the plain optional F3 Input the frame draws (reads 3 and 5: not a
//     composed field), free text ≤ 50 (D14). Writes delivery_time.
// Labels and helpers in the F3 style (D20), not the frame's SemiBold 14 / Medium 16.

export function StepTarif({
  lang,
  form,
  errors,
  onChange,
  onTouch,
}: {
  lang: Lang
  form: DraftForm
  errors: Partial<Record<Step3Field, FieldError>>
  onChange: (patch: Partial<DraftForm>) => void
  onTouch: (field: Step3Field) => void
}) {
  const message = (e?: FieldError) => (e ? t(e.key, lang, e.vars) : undefined)

  return (
    <>
      <Input
        label={t('service.wizard.price.label', lang)}
        required
        inputMode="decimal"
        autoComplete="off"
        dir="ltr"
        maxLength={DRAFT_LIMITS.priceTextMax}
        value={form.price}
        onChange={(e) => onChange({ price: e.target.value })}
        onBlur={() => onTouch('price')}
        suffix={t('product.form.currency_suffix', lang)}
        helper={t('service.wizard.price.helper', lang)}
        error={message(errors.price)}
      />
      <SegmentedRadio
        legend={t('service.wizard.unit.label', lang)}
        required
        options={PRICE_UNITS.map((unit) => ({ value: unit, label: t(`service.wizard.unit.${unit}`, lang) }))}
        value={form.priceUnit}
        onChange={(priceUnit) => onChange({ priceUnit })}
        helper={t('service.wizard.unit.helper', lang)}
        error={message(errors.priceUnit)}
        columnsClassName="grid-cols-2 sm:grid-cols-4"
      />
      <Input
        label={t('service.wizard.delivery_time.label', lang)}
        maxLength={DRAFT_LIMITS.deliveryTimeMax}
        value={form.deliveryTime}
        onChange={(e) => onChange({ deliveryTime: e.target.value })}
        onBlur={() => onTouch('deliveryTime')}
        placeholder={t('service.wizard.delivery_time.placeholder', lang)}
        helper={t('service.wizard.delivery_time.helper', lang)}
        error={message(errors.deliveryTime)}
      />
    </>
  )
}
