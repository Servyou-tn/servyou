'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { FOCUS_RING } from '@/components/layout/styles'
import { NumberStepper } from '@/app/demander/[id]/_components/NumberStepper'
import { Stepper } from '../../_components/Stepper'
import { LanguageRepeater, type LanguageRow } from './LanguageRepeater'
import { saveCompetencesAction } from '../actions'

// Duplicated from the promoted `TagInput`'s own doc comment: these two numbers used to live as
// exported constants on the route-local SkillsInput.tsx (PR-D promoted it to components/ui, which
// takes min/max as props instead of hardcoding them — see docs/follow-ups.md). "Minimum 3,
// maximum 15" per the frame's own helper text (467:20404).
const SKILLS_MIN = 3
const SKILLS_MAX = 15

// H2 step 2 "Compétences & langues" — Figma 467:20404, measured in docs/design/h2-discovery.md
// §3. The measured frame is a cropped specimen (Stepper + box only, no footer — §1) so the
// footer is unmeasured: built with exactly the two controls the brief named, "Retour" and
// "Suivant" — no third "Enregistrer et continuer plus tard" button, unlike step 1's own
// (measured) footer, since none was drawn here and none was asked for.
//
// "Retour" is a Button (not a Link) triggering router.push, reusing Button's ghost variant
// styling exactly rather than hand-copying its classes onto an anchor — no drift risk, and
// step 1's own "Enregistrer et continuer plus tard" already sets the precedent of a Button doing
// client-side navigation instead of a real link.
//
// Values preserved across "Retour": entirely a step-1-side concern (the guard renders step 1
// pre-filled from the already-inserted freelancer_profiles row) — this component does nothing
// special beyond a plain navigation; step 2's OWN in-progress (unsubmitted) edits are not carried
// back, by design — they were never submitted, so there is nothing to preserve.

type Errors = { skills?: string; languages?: string; portfolioLink?: string }

export type CompetencesInitial = {
  skills: string[]
  languages: { language: string; proficiency: string }[]
  yearsExperience: number
  portfolioLink: string
}

const YEARS_MAX = 80

export function CompetencesForm({ initial }: { initial: CompetencesInitial }) {
  const lang = useLang()
  const router = useRouter()

  const [skills, setSkills] = React.useState<string[]>(initial.skills)
  const [languageRows, setLanguageRows] = React.useState<LanguageRow[]>(() =>
    initial.languages.length > 0
      ? initial.languages.map((l) => ({ id: crypto.randomUUID(), ...l }))
      : [{ id: crypto.randomUUID(), language: '', proficiency: '' }],
  )
  const [yearsExperience, setYearsExperience] = React.useState(initial.yearsExperience)
  const [portfolioLink, setPortfolioLink] = React.useState(initial.portfolioLink)

  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function validate(): Errors {
    const next: Errors = {}
    if (skills.length < SKILLS_MIN) {
      next.skills = t('freelance.create.step2.error.skills_min', lang, { min: SKILLS_MIN })
    }
    if (languageRows.filter((r) => r.language && r.proficiency).length === 0) {
      next.languages = t('freelance.create.step2.error.languages_min', lang)
    }
    if (portfolioLink.trim() && !/^https?:\/\//i.test(portfolioLink.trim())) {
      next.portfolioLink = t('freelance.create.step2.error.portfolio_url', lang)
    }
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPending(true)
    setFormError(null)

    const res = await saveCompetencesAction({
      skills,
      languages: languageRows
        .filter((r) => r.language && r.proficiency)
        .map((r) => ({ language: r.language, proficiency: r.proficiency })),
      yearsExperience,
      portfolioLink: portfolioLink.trim(),
    })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      if (res.field) setErrors((prev) => ({ ...prev, [res.field as keyof Errors]: res.error }))
      return
    }

    router.push('/mon-profil-freelance/creer/details')
  }

  return (
    <form
      id="competences-form"
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
            { label: t('freelance.create.step2_label', lang), state: 'active' },
            { label: t('freelance.create.step3_label', lang), state: 'upcoming' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 sm:p-6">
        <TagInput
          value={skills}
          onChange={setSkills}
          min={SKILLS_MIN}
          max={SKILLS_MAX}
          label={t('freelance.create.step2.competences_label', lang)}
          placeholder={t('freelance.create.step2.competences_ph', lang)}
          helper={t('freelance.create.step2.competences_helper', lang)}
          error={errors.skills}
          getRemoveLabel={(skill) => t('freelance.delete_skill_label', lang, { name: skill })}
        />

        <LanguageRepeater rows={languageRows} onChange={setLanguageRows} lang={lang} error={errors.languages} />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-secondary">
            {t('freelance.create.step2.years_label', lang)}
          </span>
          <NumberStepper
            value={yearsExperience}
            onChange={setYearsExperience}
            min={0}
            max={YEARS_MAX}
            label={t('freelance.create.step2.years_label', lang)}
            decreaseLabel={t('freelance.create.step2.years_decrease', lang)}
            increaseLabel={t('freelance.create.step2.years_increase', lang)}
          />
          <p className="text-sm text-text-muted">{t('freelance.create.step2.years_helper', lang)}</p>
        </div>

        <Input
          id="freelancer-portfolio-link"
          label={t('freelance.create.step2.portfolio_label', lang)}
          placeholder={t('freelance.create.step2.portfolio_ph', lang)}
          helper={t('freelance.create.step2.portfolio_helper', lang)}
          error={errors.portfolioLink}
          value={portfolioLink}
          onChange={(e) => setPortfolioLink(e.target.value)}
          // A URL is inherently LTR content — undpinned inside an RTL page, "https://" bidi-
          // reverses to "//:https" (confirmed via AR screenshot, same class of issue as the
          // "3/15" counter's reference_rtl_numeric_run_reversal). dir is a plain HTML attribute
          // Input forwards via ...props, so this is a route-local pin, not a shared-primitive edit.
          dir="ltr"
        />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
          onClick={() => router.push('/mon-profil-freelance/creer')}
        >
          {t('freelance.create.back', lang)}
        </Button>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('freelance.create.submitting', lang) : t('freelance.create.next', lang)}
        </Button>
      </div>
    </form>
  )
}
