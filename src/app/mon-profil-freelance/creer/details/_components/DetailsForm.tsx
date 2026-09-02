'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { FOCUS_RING } from '@/components/layout/styles'
import { Stepper } from '../../_components/Stepper'
import { AccordionSection } from './AccordionSection'
import { EducationRepeater, type EducationRow } from './EducationRepeater'
import { CertificationRepeater, type CertificationRow } from './CertificationRepeater'
import { saveDetailsAction } from '../actions'

// H2 step 3 "Détails" — lede + four accordions measured (headers only, see actions.ts's header
// comment); footer is a founder ruling too: ONE primary right-aligned "Créer mon profil" button,
// no secondary, no "Retour" — this is the terminal create action, not an edit surface, so the
// Two-CTA Save/Publish model (H3's own pattern) does not apply here.
//
// Duplicated from actions.ts (client-boundary constant, same posture CompetencesForm.tsx already
// documents for SKILLS_MIN/MAX): the caps a submit attempt must respect client-side too.
const TOOLS_MAX = 15
const WORKING_HOURS_MAX = 500

const URL_PATTERN = /^https?:\/\//i

export type DetailsInitial = {
  education: { institution: string; degree: string; field: string; yearStart: string; yearEnd: string }[]
  certifications: { name: string; issuingOrg: string; yearObtained: string; credentialUrl: string }[]
  tools: string[]
  workingHours: string
}

export function DetailsForm({ initial }: { initial: DetailsInitial }) {
  const lang = useLang()
  const router = useRouter()

  const [educationRows, setEducationRows] = React.useState<EducationRow[]>(() =>
    initial.education.map((e) => ({ id: crypto.randomUUID(), ...e })),
  )
  const [certificationRows, setCertificationRows] = React.useState<CertificationRow[]>(() =>
    initial.certifications.map((c) => ({ id: crypto.randomUUID(), ...c })),
  )
  const [tools, setTools] = React.useState<string[]>(initial.tools)
  const [workingHours, setWorkingHours] = React.useState(initial.workingHours)

  const [credentialUrlErrors, setCredentialUrlErrors] = React.useState<Record<string, string>>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    // Anchor-required-within-a-row: an added row only reaches the payload once its own anchor
    // field is filled (mirrors LanguageRepeater's `language && proficiency` filter). Adding zero
    // rows to any of the four accordions is always valid — nothing here gates submission.
    const educationPayload = educationRows
      .filter((r) => r.institution.trim())
      .map((r) => ({
        institution: r.institution.trim(),
        degree: r.degree.trim(),
        field: r.field.trim(),
        yearStart: r.yearStart.trim() ? Number(r.yearStart.trim()) : null,
        yearEnd: r.yearEnd.trim() ? Number(r.yearEnd.trim()) : null,
      }))

    const certRowsWithAnchor = certificationRows.filter((r) => r.name.trim())
    const urlErrors: Record<string, string> = {}
    for (const row of certRowsWithAnchor) {
      const url = row.credentialUrl.trim()
      if (url && !URL_PATTERN.test(url)) {
        urlErrors[row.id] = t('freelance.create.step3.error.credential_url', lang)
      }
    }
    setCredentialUrlErrors(urlErrors)
    if (Object.keys(urlErrors).length > 0) return

    const certificationsPayload = certRowsWithAnchor.map((r) => ({
      name: r.name.trim(),
      issuingOrg: r.issuingOrg.trim(),
      yearObtained: r.yearObtained.trim() ? Number(r.yearObtained.trim()) : null,
      credentialUrl: r.credentialUrl.trim(),
    }))

    setPending(true)
    setFormError(null)

    const res = await saveDetailsAction({
      education: educationPayload,
      certifications: certificationsPayload,
      tools,
      workingHours: workingHours.trim(),
    })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      return
    }

    router.push('/mon-profil-freelance/creer/succes')
  }

  return (
    <form
      id="details-form"
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-[760px] flex-col gap-6"
    >
      <div className="flex flex-col gap-6">
        <div>
          <nav aria-label="Fil d'Ariane" className="mb-3">
            <ol className="flex items-center gap-1.5 text-sm text-text-muted">
              <li>
                <Link href="/devenir-vendeur/freelance" className={`rounded ${FOCUS_RING}`}>
                  {t('freelance.create.crumb_devenir', lang)}
                </Link>
              </li>
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </li>
              <li aria-current="page" className="font-medium text-text-primary">
                {t('freelance.create.crumb_current', lang)}
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold text-text-primary">{t('freelance.create.page_title', lang)}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{t('freelance.create.page_subtitle', lang)}</p>
        </div>

        <Stepper
          steps={[
            { label: t('freelance.create.step1_label', lang), state: 'done' },
            { label: t('freelance.create.step2_label', lang), state: 'done' },
            { label: t('freelance.create.step3_label', lang), state: 'active' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 sm:p-6">
        <p className="text-sm text-text-muted">{t('freelance.create.step3.lede', lang)}</p>

        <AccordionSection
          title={t('freelance.create.step3.formation_title', lang)}
          suffix={t('freelance.create.step3.optional_suffix', lang)}
        >
          <EducationRepeater rows={educationRows} onChange={setEducationRows} lang={lang} />
        </AccordionSection>

        <AccordionSection
          title={t('freelance.create.step3.certifications_title', lang)}
          suffix={t('freelance.create.step3.optional_suffix', lang)}
        >
          <CertificationRepeater
            rows={certificationRows}
            onChange={setCertificationRows}
            lang={lang}
            error={credentialUrlErrors}
          />
        </AccordionSection>

        <AccordionSection
          title={t('freelance.create.step3.tools_title', lang)}
          suffix={t('freelance.create.step3.optional_suffix', lang)}
        >
          <TagInput
            value={tools}
            onChange={setTools}
            max={TOOLS_MAX}
            label={t('freelance.create.step3.tools_label', lang)}
            placeholder={t('freelance.create.step3.tools_ph', lang)}
            helper={t('freelance.create.step3.tools_helper', lang)}
            getRemoveLabel={(tool) => t('freelance.create.step3.remove_tool', lang, { name: tool })}
          />
        </AccordionSection>

        <AccordionSection
          title={t('freelance.create.step3.horaires_title', lang)}
          suffix={t('freelance.create.step3.optional_suffix', lang)}
        >
          <Textarea
            label={t('freelance.create.step3.working_hours_label', lang)}
            placeholder={t('freelance.create.step3.working_hours_ph', lang)}
            helper={t('freelance.create.step3.working_hours_helper', lang)}
            counter
            maxLength={WORKING_HOURS_MAX}
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
          />
        </AccordionSection>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      <div className="flex justify-end border-t border-border-subtle pt-6">
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('freelance.create.submitting', lang) : t('freelance.create.step3.submit', lang)}
        </Button>
      </div>
    </form>
  )
}
