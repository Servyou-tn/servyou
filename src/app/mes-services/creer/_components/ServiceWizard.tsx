'use client'

import * as React from 'react'
import { useLang } from '@/components/LangProvider'
import { Stepper, type StepState } from '@/components/ui/stepper'
import { t } from '@/lib/i18n'
import {
  BUILT_STEPS,
  SERVICE_WIZARD_STEPS,
  step1Errors,
  step2Errors,
  step3Errors,
  step4Errors,
  stepPasses,
  type DraftForm,
  type FieldError,
  type ServiceWizardStep,
} from '@/lib/freelance/service-draft'
import { saveServiceDraftAction } from '../actions'
import { StepMetier } from './StepMetier'
import { StepDescription } from './StepDescription'
import { StepTarif } from './StepTarif'
import { StepPrestation } from './StepPrestation'
import { WizardFooter, type SaveState } from './WizardFooter'

// H6 « Créer un service » — the client half of /mes-services/creer: step, form, autosave.
// Layout from Figma 459:18610 (docs/design/h6-measurements.md): stepper → 32 → card (border-subtle,
// radius 12, p 24, gap 20) → footer. Steps 3–4 (459:18966 / 459:19023) reuse the same card.
// « Suivant » runs the current step's gate and moves one step on, up to the last built step;
// « Précédent » moves one step back (ruling D21).
//
// Autosave (founder ruling D8):
//   • nothing is written until the title has text (service_listings.title is NOT NULL);
//   • 1.5 s after the last edit, and at once on « Suivant », « Précédent » and « Enregistrer le
//     brouillon »;
//   • saves run one after another on a promise chain, each sending the LATEST form, so the first
//     insert's id is known before any update and two edits can't race into two drafts;
//   • the draft id lives in a ref — it never needs to re-render anything.
// Field errors appear once a field has been left (touched); they are i18n keys resolved at render,
// so an FR ⇄ AR switch re-translates them (reference_i18n_store_keys_not_text).

const AUTOSAVE_DELAY_MS = 1500

type Touched = Partial<Record<string, true>>

export function ServiceWizard({
  initialDraftId,
  initialForm,
  initialStep,
}: {
  initialDraftId: string | null
  initialForm: DraftForm
  initialStep: ServiceWizardStep
}) {
  const lang = useLang()
  const [step, setStep] = React.useState<ServiceWizardStep>(initialStep)
  const [form, setForm] = React.useState<DraftForm>(initialForm)
  const [touched, setTouched] = React.useState<Touched>({})
  const [saveState, setSaveState] = React.useState<SaveState>(initialDraftId ? 'saved' : 'idle')
  const [saveErrorKey, setSaveErrorKey] = React.useState<string | null>(null)

  const formRef = React.useRef(initialForm)
  // The step the freelancer is on NOW — read after « Suivant »'s save resolves, because a
  // « Précédent » clicked during that save must win over the pending move forward.
  const stepRef = React.useRef(initialStep)
  const draftIdRef = React.useRef(initialDraftId)
  const dirtyRef = React.useRef(false)
  const chainRef = React.useRef<Promise<boolean>>(Promise.resolve(true))
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  async function runSave(): Promise<boolean> {
    const current = formRef.current
    if (!current.title.trim()) {
      // Nothing can be written without a title — the caption must not keep claiming « Enregistré ».
      if (dirtyRef.current) setSaveState('idle')
      return false
    }
    if (!dirtyRef.current && draftIdRef.current) return true
    dirtyRef.current = false
    setSaveState('saving')
    let result: Awaited<ReturnType<typeof saveServiceDraftAction>>
    try {
      result = await saveServiceDraftAction({ draftId: draftIdRef.current, ...current })
    } catch {
      // Network drop / server crash: same visible state as a refused save, retried on the next edit.
      result = { ok: false, errorKey: 'service.wizard.error.save_failed' }
    }
    if (result.ok) {
      draftIdRef.current = result.draftId
      setSaveErrorKey(null)
      setSaveState('saved')
      return true
    }
    dirtyRef.current = true
    setSaveErrorKey(result.errorKey)
    setSaveState('error')
    return false
  }

  function save(): Promise<boolean> {
    const next = chainRef.current.then(runSave, runSave)
    chainRef.current = next
    return next
  }

  function flush(): Promise<boolean> {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    return save()
  }

  function update(patch: Partial<DraftForm>) {
    const next = { ...formRef.current, ...patch }
    formRef.current = next
    dirtyRef.current = true
    setForm(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
  }

  function touch(field: string) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  function goTo(target: ServiceWizardStep) {
    stepRef.current = target
    setStep(target)
    setTouched({})
    window.scrollTo({ top: 0 })
    // The new step's (visually hidden) heading takes focus, so a screen reader lands on it.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  async function onNext() {
    const from = step
    if (from >= BUILT_STEPS || !stepPasses(from, formRef.current)) return
    const saved = await flush()
    // Re-checked after the save: the freelancer may have gone back, or emptied a field, meanwhile.
    if (saved && stepRef.current === from && stepPasses(from, formRef.current)) goTo((from + 1) as ServiceWizardStep)
  }

  function onPrevious() {
    if (step === 1) return
    void flush()
    goTo((step - 1) as ServiceWizardStep)
  }

  function onSaveDraft() {
    if (!formRef.current.title.trim()) {
      if (step === 1) touch('title')
      return
    }
    void flush()
  }

  const shown = <E extends Partial<Record<string, FieldError>>>(errors: E): E =>
    Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field])) as E

  const stepLabel = (i: number) => t(`service.wizard.steps.${SERVICE_WIZARD_STEPS[i]}`, lang)
  const steps = SERVICE_WIZARD_STEPS.map((_, i) => ({
    label: stepLabel(i),
    state: (i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'upcoming') as StepState,
  }))

  return (
    <div className="flex flex-col gap-8">
      <Stepper
        layout="stretch"
        steps={steps}
        summary={t('service.wizard.step_summary', lang, {
          current: step,
          total: SERVICE_WIZARD_STEPS.length,
          label: stepLabel(step - 1),
        })}
      />

      <section className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-base p-6">
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          {stepLabel(step - 1)}
        </h2>
        {step === 1 && <StepMetier lang={lang} form={form} errors={shown(step1Errors(form))} onChange={update} onTouch={touch} />}
        {step === 2 && (
          <StepDescription lang={lang} form={form} errors={shown(step2Errors(form))} onChange={update} onTouch={touch} />
        )}
        {step === 3 && <StepTarif lang={lang} form={form} errors={shown(step3Errors(form))} onChange={update} onTouch={touch} />}
        {step === 4 && (
          <StepPrestation lang={lang} form={form} errors={shown(step4Errors(form))} onChange={update} onTouch={touch} />
        )}
      </section>

      <WizardFooter
        lang={lang}
        step={step}
        saveState={saveState}
        saveErrorKey={saveErrorKey}
        canNext={step < BUILT_STEPS && stepPasses(step, form)}
        onSaveDraft={onSaveDraft}
        onPrevious={onPrevious}
        onNext={() => void onNext()}
      />
    </div>
  )
}
