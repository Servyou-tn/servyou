'use client'

import { Textarea } from '@/components/ui/textarea'
import { t, type Lang } from '@/lib/i18n'
import { DRAFT_LIMITS, WIZARD_DELIVERY_MODES, type DraftForm, type FieldError, type Step4Field } from '@/lib/freelance/service-draft'
import { SegmentedRadio } from './SegmentedRadio'

// H6 step 4 « Prestation » — Figma 459:19023 card `box` (docs/design/h6-measurements.md, read 4); rulings
// in docs/design/h6-pr3-deltas.md:
//   • Ce qui est inclus — F3 Textarea, required, no counter (none drawn). One item per line, kept raw in
//     the form and split into deliverables[] at save (D16); 3–8 lines of 5–150 chars to pass.
//   • Mode de prestation — 2 equal segments (D19): « À distance » = remote, « Sur site possible » =
//     hybrid (D15). Writes delivery_mode.
//   • Ce qu'il faut me fournir (optionnel) — F3 Textarea with the drawn 0/500 counter (D17). Writes
//     buyer_briefing.

export function StepPrestation({
  lang,
  form,
  errors,
  onChange,
  onTouch,
}: {
  lang: Lang
  form: DraftForm
  errors: Partial<Record<Step4Field, FieldError>>
  onChange: (patch: Partial<DraftForm>) => void
  onTouch: (field: Step4Field) => void
}) {
  const message = (e?: FieldError) => (e ? t(e.key, lang, e.vars) : undefined)

  return (
    <>
      <Textarea
        label={t('service.wizard.deliverables.label', lang)}
        required
        maxLength={DRAFT_LIMITS.deliverablesTextMax}
        value={form.deliverablesText}
        onChange={(e) => onChange({ deliverablesText: e.target.value })}
        onBlur={() => onTouch('deliverables')}
        placeholder={t('service.wizard.deliverables.placeholder', lang)}
        helper={t('service.wizard.deliverables.helper', lang)}
        error={message(errors.deliverables)}
      />
      <SegmentedRadio
        legend={t('service.wizard.mode.label', lang)}
        required
        options={WIZARD_DELIVERY_MODES.map((mode) => ({ value: mode, label: t(`service.wizard.mode.${mode}`, lang) }))}
        value={form.deliveryMode}
        onChange={(deliveryMode) => onChange({ deliveryMode })}
        helper={t('service.wizard.mode.helper', lang)}
        error={message(errors.deliveryMode)}
        columnsClassName="grid-cols-2"
      />
      <Textarea
        label={t('service.wizard.briefing.label', lang)}
        counter
        maxLength={DRAFT_LIMITS.briefingMax}
        value={form.buyerBriefing}
        onChange={(e) => onChange({ buyerBriefing: e.target.value })}
        onBlur={() => onTouch('buyerBriefing')}
        placeholder={t('service.wizard.briefing.placeholder', lang)}
        helper={t('service.wizard.briefing.helper', lang)}
        error={message(errors.buyerBriefing)}
      />
    </>
  )
}
