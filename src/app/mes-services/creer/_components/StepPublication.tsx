'use client'

import type * as React from 'react'
import { CircleAlert } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import {
  parsePrice,
  skillLabel,
  type DraftForm,
  type ServiceWizardStep,
  type WizardField,
} from '@/lib/freelance/service-draft'
import { formatServicePrice } from '@/lib/freelance/service-price'
import { getSector, getSubcategory } from '@/lib/taxonomy/service-categories'

// H6 step 5 « Publication » — Figma 459:19071 card `box` (docs/design/h6-measurements.md, read 6); rulings
// in docs/design/h6-pr4-deltas.md:
//   • `recapitulatif` (459:19118): surface-subtle block, border-subtle, radius-lg, px 16 / py 4; rows py 8
//     with a border-subtle divider (not after the last); label body-sm muted · gap 12 · value Medium 14
//     primary · « Modifier » body-sm blue-600 at the end.
//   • The six drawn rows + « Description » (the short description → step 2), so every step 1–4 has a
//     « Modifier » (D23). An empty Délai keeps its row, as « Non précisé » (D24).
//   • The frame's rows are nowrap + clipped; here values wrap, and below `sm` the value takes its own line
//     under label + « Modifier » (D25) — an 80-character title can't fit 343 on one line.
//   • « Modifier » is drawn as text; it is an in-page action, so a <button> styled as drawn, named
//     « Modifier — <row> » for screen readers, with a ≥ 44 px hit area (touch-target rule).
//   • Price row: « 800 TND · Fixe » — the stored unit's D13 label (the frame's « Par projet » predates D13).
// A publish refusal (validator or DB gate) flags the rows whose « Modifier » leads to a failing field:
// « Ce qui est inclus » and the brief have no row of their own and flag « Mode », the only step-4 row.
// User text (title, skills, description, délai) is isolated with <bdi>, so a French value can't reorder
// an Arabic row (reference_ar_latin_adjacency_bidi).

type RecapRow = {
  key: string
  labelKey: string
  value: string | null
  /** The value is the freelancer's own text — isolate it from the page direction. */
  userText: boolean
  step: ServiceWizardStep
  fields: readonly WizardField[]
}

function recapRows(form: DraftForm, lang: Lang): RecapRow[] {
  const sector = getSector(form.sectorId)
  const sub = getSubcategory(form.sectorId, form.subcategoryId)
  const label = (x: { labelFr: string; labelAr: string } | undefined) => (x ? (lang === 'ar' ? x.labelAr : x.labelFr) : '')
  const price = parsePrice(form.price)
  return [
    { key: 'title', labelKey: 'service.wizard.recap.title', value: form.title.trim(), userText: true, step: 1, fields: ['title'] },
    {
      key: 'category',
      labelKey: 'service.wizard.recap.category',
      value: [label(sector), label(sub)].filter(Boolean).join(' › '),
      userText: false,
      step: 1,
      fields: ['sector', 'subcategory'],
    },
    {
      key: 'skills',
      labelKey: 'service.wizard.recap.skills',
      value: form.skills.map((s) => skillLabel(s, lang)).join(' · '),
      userText: true,
      step: 1,
      fields: ['skills'],
    },
    {
      key: 'description',
      labelKey: 'service.wizard.recap.description',
      value: form.shortDescription.trim(),
      userText: true,
      step: 2,
      fields: ['shortDescription', 'description'],
    },
    {
      key: 'price',
      labelKey: 'service.wizard.recap.price',
      value: t('service.wizard.recap.price_value', lang, {
        price: price === null ? form.price.trim() : formatServicePrice(price, lang),
        unit: t(`service.wizard.unit.${form.priceUnit}`, lang),
      }),
      userText: false,
      step: 3,
      fields: ['price', 'priceUnit'],
    },
    {
      key: 'deliveryTime',
      labelKey: 'service.wizard.recap.delivery_time',
      value: form.deliveryTime.trim() || null,
      userText: true,
      step: 3,
      fields: ['deliveryTime'],
    },
    {
      key: 'mode',
      labelKey: 'service.wizard.recap.mode',
      value: t(`service.wizard.mode.${form.deliveryMode}`, lang),
      userText: false,
      step: 4,
      fields: ['deliveryMode', 'deliverables', 'buyerBriefing'],
    },
  ]
}

export function StepPublication({
  lang,
  form,
  errorKey,
  failedFields,
  disabled,
  onEdit,
}: {
  lang: Lang
  form: DraftForm
  /** The last publish refusal's message key, or null. */
  errorKey: string | null
  failedFields: readonly WizardField[]
  disabled: boolean
  onEdit: (step: ServiceWizardStep) => void
}) {
  const rows = recapRows(form, lang)

  return (
    <>
      {errorKey && (
        <p role="alert" className="flex items-start gap-2 text-body-sm text-danger-500">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(errorKey, lang)}
        </p>
      )}
      <ul className="flex flex-col rounded-lg border border-border-subtle bg-surface-subtle px-4 py-1">
        {rows.map((row, i) => {
          const label = t(row.labelKey, lang)
          const flagged = row.fields.some((f) => failedFields.includes(f))
          let value: React.ReactNode = t('service.wizard.recap.not_set', lang)
          if (row.value) value = row.userText ? <bdi>{row.value}</bdi> : row.value
          return (
            <li
              key={row.key}
              className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 sm:flex-nowrap ${
                i < rows.length - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <span className={`order-1 flex shrink-0 items-center gap-1 text-body-sm ${flagged ? 'text-danger-500' : 'text-text-muted'}`}>
                {flagged && <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {label}
                {flagged && <span className="sr-only">{t('service.wizard.recap.flagged', lang)}</span>}
              </span>
              <span
                className={`order-3 min-w-0 basis-full break-words text-body-sm sm:order-2 sm:flex-1 sm:basis-auto ${
                  row.value ? 'font-medium text-text-primary' : 'text-text-muted'
                }`}
              >
                {value}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onEdit(row.step)}
                aria-label={t('service.wizard.recap.edit_aria', lang, { field: label })}
                className={`relative order-2 shrink-0 rounded text-body-sm text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline sm:order-3 ${FOCUS_RING}`}
              >
                {t('service.wizard.recap.edit', lang)}
                {/* Touch target: ≥ 44 px tall without moving the 21 px text (Button's own hit-area pattern). */}
                <span aria-hidden="true" className="absolute -inset-x-2 -inset-y-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
