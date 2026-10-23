'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { t, type Lang } from '@/lib/i18n'
import { DRAFT_LIMITS, type DraftForm, type FieldError, type Step2Field } from '@/lib/freelance/service-draft'

// H6 step 2 « Description » — Figma 461:19405 card `box` (docs/design/h6-measurements.md, read 2):
// « Description courte » is a single-line F3 Input (counter 0/160) writing the new
// short_description column (migration 20261023212930); « Description détaillée » is the F3 Textarea
// (h 120, counter 0/2000) writing the existing `description`.

export function StepDescription({
  lang,
  form,
  errors,
  onChange,
  onTouch,
}: {
  lang: Lang
  form: DraftForm
  errors: Partial<Record<Step2Field, FieldError>>
  onChange: (patch: Partial<DraftForm>) => void
  onTouch: (field: Step2Field) => void
}) {
  const message = (e?: FieldError) => (e ? t(e.key, lang, e.vars) : undefined)

  return (
    <>
      <Input
        label={t('service.wizard.short.label', lang)}
        required
        counter
        maxLength={DRAFT_LIMITS.shortMax}
        value={form.shortDescription}
        onChange={(e) => onChange({ shortDescription: e.target.value })}
        onBlur={() => onTouch('shortDescription')}
        placeholder={t('service.wizard.short.placeholder', lang)}
        helper={t('service.wizard.short.helper', lang)}
        error={message(errors.shortDescription)}
      />
      <Textarea
        label={t('service.wizard.description.label', lang)}
        required
        counter
        maxLength={DRAFT_LIMITS.descriptionMax}
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
        onBlur={() => onTouch('description')}
        placeholder={t('service.wizard.description.placeholder', lang)}
        helper={t('service.wizard.description.helper', lang)}
        error={message(errors.description)}
      />
    </>
  )
}
