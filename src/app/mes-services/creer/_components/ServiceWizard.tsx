'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
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
  stepErrors,
  stepPasses,
  type DraftForm,
  type FieldError,
  type ServiceWizardStep,
  type WizardField,
} from '@/lib/freelance/service-draft'
import { updateServiceAction } from '@/app/mes-services/[id]/modifier/actions'
import { publishServiceDraftAction, saveServiceDraftAction } from '../actions'
import { StepMetier } from './StepMetier'
import { StepDescription } from './StepDescription'
import { StepTarif } from './StepTarif'
import { StepPrestation } from './StepPrestation'
import { StepPublication } from './StepPublication'
import { WizardFooter, type SaveState } from './WizardFooter'
import { useLeaveGuard } from './useLeaveGuard'

// H6 « Créer un service » — the client half of /mes-services/creer: step, form, autosave.
// Layout from Figma 459:18610 (docs/design/h6-measurements.md): stepper → 32 → card (border-subtle,
// radius 12, p 24, gap 20) → footer. Steps 3–5 (459:18966 / 459:19023 / 459:19071) reuse the same card.
// « Suivant » runs the current step's gate and moves one step on, up to step 5 (the récapitulatif);
// « Précédent » moves one step back (ruling D21); a récap « Modifier » jumps to its step, and « Suivant »
// then walks forward again (ruling D26).
//
// A resumed draft says so in one line above the stepper (founder ruling, PR-4): the four « Créer un
// service » CTAs silently reopen an unfinished draft (D7), and the line is how the freelancer learns it.
//
// « Publier mon service » (step 5, ruling D29): the autosave chain is flushed first — publishing takes
// the SAVED draft, re-read server-side — then publishServiceDraftAction runs with the draft id only.
// From that point no autosave may fire (it would hit a row that is no longer a draft → « brouillon
// introuvable »). Success REPLACES this page with /mes-services/creer/succes, so Back can't restore a
// wizard holding a dead draft id (D33). A refusal flags the récap rows and re-opens the footer.
//
// EDIT MODE (H7 « Modifier un service », docs/design/h7-deltas.md): the same wizard on a live or paused
// service. A live listing must never show half-edits, so NOTHING is autosaved — not on a keystroke, not on
// « Suivant » / « Précédent », not on a draft button (there is none). The form lives in memory until the
// récap's « Enregistrer les modifications » sends it, whole, to updateServiceAction (status unchanged).
// Unsaved changes are announced in the footer and guarded on exit (useLeaveGuard). A refusal flags the récap
// rows exactly like the H6 publish refusal. Success toasts and returns to /mes-services.
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
  mode = 'create',
  serviceId = null,
}: {
  initialDraftId: string | null
  initialForm: DraftForm
  initialStep: ServiceWizardStep
  /** 'edit': a live / paused service (needs serviceId) — no autosave, explicit save on the récap. */
  mode?: 'create' | 'edit'
  serviceId?: string | null
}) {
  const editing = mode === 'edit'
  const lang = useLang()
  const [step, setStep] = React.useState<ServiceWizardStep>(initialStep)
  const [form, setForm] = React.useState<DraftForm>(initialForm)
  const [touched, setTouched] = React.useState<Touched>({})
  const [saveState, setSaveState] = React.useState<SaveState>(initialDraftId ? 'saved' : 'idle')
  const [saveErrorKey, setSaveErrorKey] = React.useState<string | null>(null)
  const [publishing, setPublishing] = React.useState(false)
  const [publishErrorKey, setPublishErrorKey] = React.useState<string | null>(null)
  const [failedFields, setFailedFields] = React.useState<WizardField[]>([])
  const router = useRouter()
  // The title the page resumed with — the notice names the draft as it was found, not as it's edited.
  const [resumedTitle] = React.useState(() => (initialDraftId ? initialForm.title.trim() : ''))

  const formRef = React.useRef(initialForm)
  // The step the freelancer is on NOW — read after « Suivant »'s save resolves, because a
  // « Précédent » clicked during that save must win over the pending move forward.
  const stepRef = React.useRef(initialStep)
  const draftIdRef = React.useRef(initialDraftId)
  const dirtyRef = React.useRef(false)
  const chainRef = React.useRef<Promise<boolean>>(Promise.resolve(true))
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  // Set once publishing has taken the saved draft: from then on nothing is written to it.
  const lockedRef = React.useRef(false)
  const publishingRef = React.useRef(false)
  // Edit mode: the form as last saved (or loaded), and whether the form differs from it.
  const baselineRef = React.useRef(JSON.stringify(initialForm))
  const unsavedRef = React.useRef(false)
  const [unsaved, setUnsaved] = React.useState(false)
  useLeaveGuard(() => editing && unsavedRef.current, t('service.edit.leave_confirm', lang))

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  async function runSave(): Promise<boolean> {
    if (lockedRef.current) return false
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
    setForm(next)
    if (editing) {
      const changed = JSON.stringify(next) !== baselineRef.current
      unsavedRef.current = changed
      setUnsaved(changed)
      return
    }
    dirtyRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
  }

  function touch(field: string) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  function goTo(target: ServiceWizardStep, show: Touched = {}) {
    stepRef.current = target
    setStep(target)
    setTouched(show)
    window.scrollTo({ top: 0 })
    // The new step's (visually hidden) heading takes focus, so a screen reader lands on it.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  async function onNext() {
    const from = step
    if (from >= BUILT_STEPS || !stepPasses(from, formRef.current)) return
    if (editing) {
      goTo((from + 1) as ServiceWizardStep)
      return
    }
    const saved = await flush()
    // Re-checked after the save: the freelancer may have gone back, or emptied a field, meanwhile.
    if (saved && stepRef.current === from && stepPasses(from, formRef.current)) goTo((from + 1) as ServiceWizardStep)
  }

  function onPrevious() {
    if (step === 1) return
    if (!editing) void flush()
    goTo((step - 1) as ServiceWizardStep)
  }

  // Récap « Modifier »: open the step with whatever fails there already shown (a publish refusal sends the
  // freelancer here to fix it).
  function onEdit(target: ServiceWizardStep) {
    if (publishingRef.current) return
    setPublishErrorKey(null)
    setFailedFields([])
    goTo(target, Object.fromEntries(Object.keys(stepErrors(target, formRef.current)).map((f) => [f, true])))
  }

  async function onPublish() {
    if (publishingRef.current || !stepPasses(5, formRef.current)) return
    publishingRef.current = true
    setPublishing(true)
    setPublishErrorKey(null)
    setFailedFields([])
    const saved = await flush()
    const draftId = draftIdRef.current
    if (!saved || !draftId) {
      // The caption already shows why the save failed.
      publishingRef.current = false
      setPublishing(false)
      return
    }
    lockedRef.current = true
    let result: Awaited<ReturnType<typeof publishServiceDraftAction>>
    try {
      result = await publishServiceDraftAction({ draftId })
    } catch {
      result = { ok: false, errorKey: 'service.wizard.error.publish_failed', fields: [] }
    }
    if (result.ok) {
      // Stays « publishing » (footer inert) until the success page replaces this one.
      router.replace(`/mes-services/creer/succes?service=${result.serviceId}`)
      return
    }
    lockedRef.current = false
    publishingRef.current = false
    setPublishing(false)
    setPublishErrorKey(result.errorKey)
    setFailedFields(result.fields)
  }

  // Edit mode's « Enregistrer les modifications »: one explicit write of the whole form.
  async function onSaveEdit() {
    if (publishingRef.current || !serviceId || !stepPasses(5, formRef.current)) return
    publishingRef.current = true
    setPublishing(true)
    setPublishErrorKey(null)
    setFailedFields([])
    let result: Awaited<ReturnType<typeof updateServiceAction>>
    try {
      result = await updateServiceAction({ serviceId, ...formRef.current })
    } catch {
      result = { ok: false, errorKey: 'service.edit.error.save_failed', fields: [] }
    }
    if (result.ok) {
      // Saved on purpose: leaving must not ask. Stays « publishing » (footer inert) until the list replaces this page.
      baselineRef.current = JSON.stringify(formRef.current)
      unsavedRef.current = false
      setUnsaved(false)
      toast.success(t('service.edit.saved', lang))
      router.push('/mes-services')
      return
    }
    publishingRef.current = false
    setPublishing(false)
    setPublishErrorKey(result.errorKey)
    setFailedFields(result.fields)
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
      <div className="flex flex-col gap-4">
        {!editing && resumedTitle && (
          <p className="flex items-start gap-2 text-body-sm text-text-secondary">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue-600" aria-hidden="true" />
            {/* FSI … PDI isolate the title, so a French title can't reorder the Arabic sentence. */}
            <span>{t('service.wizard.resume_notice', lang, { title: `\u2068${resumedTitle}\u2069` })}</span>
          </p>
        )}
        <Stepper
          layout="stretch"
          steps={steps}
          summary={t('service.wizard.step_summary', lang, {
            current: step,
            total: SERVICE_WIZARD_STEPS.length,
            label: stepLabel(step - 1),
          })}
        />
      </div>

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
        {step === 5 && (
          <StepPublication
            lang={lang}
            form={form}
            errorKey={publishErrorKey}
            failedFields={failedFields}
            disabled={publishing}
            onEdit={onEdit}
          />
        )}
      </section>

      <WizardFooter
        lang={lang}
        step={step}
        saveState={saveState}
        saveErrorKey={saveErrorKey}
        canNext={stepPasses(step, form)}
        editing={editing}
        unsaved={unsaved}
        publishing={publishing}
        onSaveDraft={onSaveDraft}
        onPrevious={onPrevious}
        onNext={() => void onNext()}
        onPublish={() => void (editing ? onSaveEdit() : onPublish())}
      />
    </div>
  )
}
