'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/app/demander/[id]/_components/Textarea'
import { FOCUS_RING } from '@/components/layout/styles'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { createFreelancerProfileAction } from '../actions'
import { Stepper } from './Stepper'
import { AvatarField } from './AvatarField'

// H2 step 1 "Bases" — Figma 466:20244, measured in docs/design/h2-discovery.md.
//
// The "Suivant" button renders `state=disabled` in the frame even though the demo's own
// pre-filled Nom complet field is valid — read as an unbound default Button instance (same
// class of authoring artifact as the h-100 wrappers), not a real pre-submit-disable behaviour.
// G2's shipped form has no such gating either (validates on submit, shows inline errors) — this
// mirrors that, not the class name.

const HEADLINE_MAX = 100
const BIO_MIN = 100
const BIO_MAX = 2000

type Errors = { fullName?: string; headline?: string; bio?: string; city?: string }

export function CreateFreelancerProfileForm({
  fullName: initialFullName,
  avatarUrl,
  initial,
}: {
  fullName: string | null
  avatarUrl: string | null
  /** Present only on a revisit (page.tsx's guard: profile exists, step 2 not yet finished) — the
   *  fields other than fullName started blank even for a prefill-capable form until this prop
   *  existed, since a fresh create never had anything to prefill them with. */
  initial?: { headline: string; bio: string; city: string }
}) {
  const lang = useLang()
  const router = useRouter()

  const [fullName, setFullName] = React.useState(initialFullName ?? '')
  const [headline, setHeadline] = React.useState(initial?.headline ?? '')
  const [bio, setBio] = React.useState(initial?.bio ?? '')
  const [city, setCity] = React.useState(initial?.city ?? '')

  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function validate(): Errors {
    const next: Errors = {}
    if (!fullName.trim()) next.fullName = t('freelance.create.error.name_required', lang)

    if (!headline.trim()) next.headline = t('freelance.create.error.headline_required', lang)

    const trimmedBio = bio.trim()
    if (trimmedBio.length < BIO_MIN) {
      next.bio = t('freelance.create.error.bio_min', lang, { min: BIO_MIN })
    } else if (trimmedBio.length > BIO_MAX) {
      next.bio = t('freelance.create.error.bio_max', lang, { max: BIO_MAX })
    }

    if (!city) next.city = t('freelance.create.error.city_required', lang)
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFormError(t('freelance.create.error.form', lang))
      return
    }

    setPending(true)
    setFormError(null)

    const res = await createFreelancerProfileAction({
      fullName: fullName.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      city,
    })
    if (!res.ok) {
      setPending(false)
      setFormError(res.error)
      if (res.field) setErrors((prev) => ({ ...prev, [res.field as keyof Errors]: res.error }))
      return
    }

    // Which button triggered this submit — read from the DOM submitter, same pattern G2's
    // CreateShopForm.tsx uses (docs/design/h2-discovery.md §8 named this exact repoint as the
    // known gap before step 2 shipped). "Suivant" (data-intent="next") now advances to step 2;
    // "Enregistrer et continuer plus tard" still lands on /tableau-de-bord — NOT
    // /tableau-de-bord-vendeur, which calls requireShopOwner and bounces a real freelancer to
    // /devenir-vendeur (caught live during the QA walk, 2026-08-14 — see the matching note on
    // page.tsx's guard).
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.dataset.intent === 'next' ? 'next' : 'draft'
    router.push(intent === 'next' ? '/mon-profil-freelance/creer/competences' : '/tableau-de-bord')
  }

  const selectField = `w-full rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

  return (
    <form
      id="create-freelancer-profile-form"
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
            { label: t('freelance.create.step1_label', lang), state: 'active' },
            { label: t('freelance.create.step2_label', lang), state: 'upcoming' },
            { label: t('freelance.create.step3_label', lang), state: 'upcoming' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-4 sm:p-6">
        <AvatarField avatarUrl={avatarUrl} fullName={fullName} lang={lang} />

        <Input
          id="freelancer-full-name"
          label={t('freelance.create.name_label', lang)}
          helper={t('freelance.create.name_helper', lang)}
          error={errors.fullName}
          required
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          id="freelancer-headline"
          label={t('freelance.create.headline_label', lang)}
          placeholder={t('freelance.create.headline_ph', lang)}
          helper={t('freelance.create.headline_helper', lang)}
          error={errors.headline}
          required
          counter
          maxLength={HEADLINE_MAX}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />

        <Textarea
          id="freelancer-bio"
          label={t('freelance.create.bio_label', lang)}
          placeholder={t('freelance.create.bio_ph', lang)}
          helper={t('freelance.create.bio_helper', lang)}
          error={errors.bio}
          required
          counter
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="freelancer-city" className="text-sm font-medium text-text-secondary">
            {t('freelance.create.city_label', lang)}
            <span aria-hidden="true" className="text-danger-500"> *</span>
          </label>
          <select
            id="freelancer-city"
            aria-required="true"
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={errors.city ? 'freelancer-city-error' : 'freelancer-city-helper'}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`${selectField} ${errors.city ? 'border-danger-500' : 'border-border-strong'}`}
          >
            <option value="">{t('freelance.create.city_ph', lang)}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {lang === 'ar' ? g.ar : g.fr}
              </option>
            ))}
          </select>
          {errors.city ? (
            <p id="freelancer-city-error" className="text-sm text-danger-500">
              {errors.city}
            </p>
          ) : (
            <p id="freelancer-city-helper" className="text-sm text-text-muted">
              {t('freelance.create.city_helper', lang)}
            </p>
          )}
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      )}

      {/* Footer — flex-col-reverse below sm, matching CreateShopForm.tsx's same unmeasured-375
          rule (no frame exists to check the pair against 311px available; the last DOM child
          lands on top when stacked). */}
      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="ghost" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? t('freelance.create.submitting', lang) : t('freelance.create.save_draft', lang)}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          data-intent="next"
          className="w-full sm:w-auto"
        >
          {pending ? t('freelance.create.submitting', lang) : t('freelance.create.next', lang)}
        </Button>
      </div>
    </form>
  )
}
