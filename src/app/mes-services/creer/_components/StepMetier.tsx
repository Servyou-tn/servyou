'use client'

import { Input } from '@/components/ui/input'
import { TagInput } from '@/components/ui/tag-input'
import { t, type Lang } from '@/lib/i18n'
import { DRAFT_LIMITS, normalizeSkill, skillLabel, type DraftForm, type FieldError, type Step1Field } from '@/lib/freelance/service-draft'
import { getSector, getSkillPool, serviceCategories } from '@/lib/taxonomy/service-categories'
import { SelectField } from './SelectField'

// H6 step 1 « Métier » — Figma 459:18610 card `Box 1 — Métier` (docs/design/h6-measurements.md):
// Titre (F3 Input, counter 0/80) → two-col Catégorie / Sous-catégorie → Compétences.
//
// Both selects and the skill pool come from the TS taxonomy, never the DB list: the DB also holds
// `maison` (kind='both'), which must not show up as a 14th sector. The action resolves slug → uuid.
//
// Compétences (founder ruling D5): the shared TagInput with suggestions from the ACTIVE sector's
// pool; the label is styled like the card's other fields, not the frame's 16/26 primary — logged in
// docs/follow-ups.md with the field's other frame deltas (px 12, chip weight, helper colour).

export function StepMetier({
  lang,
  form,
  errors,
  onChange,
  onTouch,
}: {
  lang: Lang
  form: DraftForm
  /** Only the errors of fields already touched. */
  errors: Partial<Record<Step1Field, FieldError>>
  onChange: (patch: Partial<DraftForm>) => void
  onTouch: (field: Step1Field) => void
}) {
  const message = (e?: FieldError) => (e ? t(e.key, lang, e.vars) : undefined)
  const labelOf = (item: { labelFr: string; labelAr: string }) => (lang === 'ar' ? item.labelAr : item.labelFr)

  const sector = getSector(form.sectorId)
  const suggestions = getSkillPool(form.sectorId).map((s) => ({ value: s.id, label: labelOf(s) }))

  return (
    <>
      <Input
        label={t('service.wizard.title.label', lang)}
        required
        counter
        maxLength={DRAFT_LIMITS.titleMax}
        value={form.title}
        onChange={(e) => onChange({ title: e.target.value })}
        onBlur={() => onTouch('title')}
        placeholder={t('service.wizard.title.placeholder', lang)}
        helper={t('service.wizard.title.helper', lang)}
        error={message(errors.title)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label={t('service.wizard.category.label', lang)}
          required
          placeholder={t('service.wizard.category.placeholder', lang)}
          helper={t('service.wizard.category.helper', lang)}
          error={message(errors.sector)}
          options={serviceCategories.map((s) => ({ value: s.id, label: labelOf(s) }))}
          value={form.sectorId}
          // A new sector invalidates the subcategory; the skills stay (they resolve from any pool).
          onChange={(sectorId) => onChange({ sectorId, subcategoryId: '' })}
          onBlur={() => onTouch('sector')}
        />
        <SelectField
          label={t('service.wizard.subcategory.label', lang)}
          required
          disabled={!sector}
          placeholder={t(sector ? 'service.wizard.subcategory.placeholder' : 'service.wizard.subcategory.placeholder_locked', lang)}
          helper={t('service.wizard.subcategory.helper', lang)}
          error={sector ? message(errors.subcategory) : undefined}
          options={(sector?.subcategories ?? []).map((s) => ({ value: s.id, label: labelOf(s) }))}
          value={form.subcategoryId}
          onChange={(subcategoryId) => onChange({ subcategoryId })}
          onBlur={() => onTouch('subcategory')}
        />
      </div>

      <TagInput
        label={t('service.wizard.skills.label', lang)}
        min={DRAFT_LIMITS.skillsMin}
        max={DRAFT_LIMITS.skillsMax}
        maxLength={DRAFT_LIMITS.skillMax}
        showCount={false}
        value={form.skills}
        onChange={(skills) => onChange({ skills })}
        onBlur={() => onTouch('skills')}
        suggestions={suggestions}
        getLabel={(value) => skillLabel(value, lang)}
        normalize={(text) => normalizeSkill(text, form.sectorId)}
        getAddLabel={(text) => t('service.wizard.skills.add', lang, { name: text })}
        getRemoveLabel={(value) => t('service.wizard.skills.remove', lang, { name: skillLabel(value, lang) })}
        placeholder={t('service.wizard.skills.placeholder', lang)}
        helper={t('service.wizard.skills.helper', lang)}
        error={message(errors.skills)}
      />
    </>
  )
}
