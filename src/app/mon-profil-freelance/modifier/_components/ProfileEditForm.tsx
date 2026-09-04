'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/tag-input'
import { t, type Lang } from '@/lib/i18n'
import {
  HEADLINE_MAX,
  BIO_MAX,
  SKILLS_MAX,
  WORKING_HOURS_MAX,
  WORKPLACE_LOCATION_MAX,
  YEARS_MAX,
  validateForPublish,
  type FreelancerProfileEditData,
} from '@/lib/marche/freelancer-profile-edit'
import { saveProfileAction, publishProfileAction } from '../actions'
import { AccordionSection } from './AccordionSection'
import { AvatarField } from './AvatarField'
import { LinksRepeater, type LinkRow } from './LinksRepeater'
import { PortfolioRepeater, type PortfolioRow } from './PortfolioRepeater'
import { LanguageRepeater, type LanguageRow } from './LanguageRepeater'
import { EducationRepeater, type EducationRow } from './EducationRepeater'
import { CertificationRepeater, type CertificationRow } from './CertificationRepeater'
import { StickyFooter } from './StickyFooter'
import { ValidationBanner, FieldError } from './ValidationBanner'

// H3 "Modifier mon profil" — 404:11909, 7 accordions + identity panel + sticky footer. Everything
// lives in one client component: a single Enregistrer/Publier pair covers the whole page (not a
// per-accordion save), matching the measured footer exactly (one dirty indicator, one pair of
// CTAs for the entire form).
//
// CUT from this PR (founder ruling): banner upload (no column anywhere, second upload surface —
// its own PR), "Note et projets livrés" (no reviews table, ratings are Phase 3+ — a frame number
// that cannot be honestly computed is omitted, not zeroed), "Informations complémentaires" (no
// column, no clear semantic to invent).

export function ProfileEditForm({ initial, lang }: { initial: FreelancerProfileEditData; lang: Lang }) {
  const [headline, setHeadline] = React.useState(initial.headline)
  const [bio, setBio] = React.useState(initial.bio)
  const [yearsExperience, setYearsExperience] = React.useState(String(initial.yearsExperience))
  const [workingHours, setWorkingHours] = React.useState(initial.workingHours)
  const [workplaceLocation, setWorkplaceLocation] = React.useState(initial.workplaceLocation)
  const [skills, setSkills] = React.useState<string[]>(initial.skills)
  const [tools, setTools] = React.useState<string[]>(initial.tools)
  const [languageRows, setLanguageRows] = React.useState<LanguageRow[]>(() =>
    initial.languages.map((l) => ({ id: crypto.randomUUID(), ...l })),
  )
  const [linkRows, setLinkRows] = React.useState<LinkRow[]>(() => initial.links.map((l) => ({ id: l.id, label: l.label, url: l.url })))
  const [portfolioRows, setPortfolioRows] = React.useState<PortfolioRow[]>(() =>
    initial.portfolioItems.map((p) => ({ id: p.id, imageUrl: p.imageUrl, title: p.title ?? '', url: p.url ?? '', description: p.description ?? '' })),
  )
  const [educationRows, setEducationRows] = React.useState<EducationRow[]>(() =>
    initial.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree ?? '',
      yearStart: e.yearStart != null ? String(e.yearStart) : '',
      yearEnd: e.yearEnd != null ? String(e.yearEnd) : '',
    })),
  )
  const [certificationRows, setCertificationRows] = React.useState<CertificationRow[]>(() =>
    initial.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuingOrg: c.issuingOrg ?? '',
      yearObtained: c.yearObtained != null ? String(c.yearObtained) : '',
      credentialUrl: c.credentialUrl ?? '',
    })),
  )

  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [publishMissing, setPublishMissing] = React.useState<('headline' | 'bio' | 'skills')[]>([])
  const [publishNotice, setPublishNotice] = React.useState<'published' | 'needs_listing' | null>(null)

  // One touch-tracker for every field — this page has no per-accordion save, so a single "has
  // anything changed since the last successful save" flag is what the footer's dirty indicator
  // needs. Reset to false only after a successful save/publish, never optimistically.
  function touch<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (value: React.SetStateAction<T>) => {
      setDirty(true)
      setPublishNotice(null)
      setter(value)
    }
  }
  const setHeadlineT = touch(setHeadline)
  const setBioT = touch(setBio)
  const setYearsT = touch(setYearsExperience)
  const setHoursT = touch(setWorkingHours)
  const setLocationT = touch(setWorkplaceLocation)
  const setSkillsT = touch(setSkills)
  const setToolsT = touch(setTools)
  const setLanguagesT = touch(setLanguageRows)
  const setLinksT = touch(setLinkRows)
  const setPortfolioT = touch(setPortfolioRows)
  const setEducationT = touch(setEducationRows)
  const setCertificationsT = touch(setCertificationRows)

  function buildPayload() {
    return {
      headline,
      bio,
      yearsExperience: Number(yearsExperience) || 0,
      workingHours,
      workplaceLocation,
      skills,
      tools,
      languages: languageRows.filter((r) => r.language && r.proficiency).map((r) => ({ language: r.language, proficiency: r.proficiency })),
      links: linkRows.filter((r) => r.label.trim() && r.url.trim()).map((r) => ({ label: r.label.trim(), url: r.url.trim() })),
      portfolio: portfolioRows.map((r) => ({
        imageUrl: r.imageUrl,
        title: r.title.trim(),
        url: r.url.trim(),
        description: r.description.trim(),
      })),
      education: educationRows
        .filter((r) => r.institution.trim())
        .map((r) => ({
          institution: r.institution.trim(),
          degree: r.degree.trim(),
          yearStart: r.yearStart.trim() ? Number(r.yearStart.trim()) : null,
          yearEnd: r.yearEnd.trim() ? Number(r.yearEnd.trim()) : null,
        })),
      certifications: certificationRows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          issuingOrg: r.issuingOrg.trim(),
          yearObtained: r.yearObtained.trim() ? Number(r.yearObtained.trim()) : null,
          credentialUrl: r.credentialUrl.trim(),
        })),
    }
  }

  const clientValidation = validateForPublish({ headline, bio, skillsCount: skills.length })
  const canPublish = clientValidation.ok

  async function onSave() {
    if (saving || publishing) return
    setSaving(true)
    setFormError(null)
    const res = await saveProfileAction(buildPayload())
    setSaving(false)
    if (!res.ok) {
      setFormError(res.error)
      return
    }
    setDirty(false)
  }

  async function onPublish() {
    if (saving || publishing) return
    setPublishing(true)
    setFormError(null)
    setPublishMissing([])
    setPublishNotice(null)
    const res = await publishProfileAction(buildPayload())
    setPublishing(false)
    if (!res.ok) {
      if (res.status === 'validation_failed') {
        setPublishMissing(res.missing)
        setDirty(false) // the save half of publishProfileAction still succeeded
        return
      }
      setFormError(res.error)
      return
    }
    setDirty(false)
    setPublishNotice(res.status === 'published' ? 'published' : 'needs_listing')
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface-base p-5 sm:p-6">
        <AvatarField avatarUrl={initial.identity.avatarUrl} fullName={initial.identity.fullName} lang={lang} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-subtle p-4">
            <p className="text-sm text-text-muted">{t('freelance.edit.display_name_label', lang)}</p>
            <p className="text-base font-medium text-text-primary">{initial.identity.fullName}</p>
            <a href="/parametres" className="mt-1 inline-block text-sm font-medium text-brand-blue-600 hover:underline">
              {t('freelance.edit.edit_in_settings', lang)}
            </a>
          </div>
          <div className="rounded-lg bg-surface-subtle p-4">
            <p className="text-sm text-text-muted">{t('freelance.edit.location_label', lang)}</p>
            <p className="text-base font-medium text-text-primary">{initial.identity.city}</p>
            <a href="/parametres" className="mt-1 inline-block text-sm font-medium text-brand-blue-600 hover:underline">
              {t('freelance.edit.edit_in_settings', lang)}
            </a>
          </div>
        </div>

        <div>
          <Input
            label={t('freelance.edit.headline_label', lang)}
            required
            counter
            maxLength={HEADLINE_MAX}
            helper={t('freelance.edit.headline_helper', lang)}
            value={headline}
            onChange={(e) => setHeadlineT(e.target.value)}
          />
          <FieldError show={publishMissing.includes('headline')} textKey="freelance.edit.error_headline" lang={lang} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <AccordionSection title={t('freelance.edit.trust_title', lang)} complete={linkRows.length > 0 || Number(yearsExperience) > 0} defaultOpen>
          <div>
            <label className="text-sm font-medium text-text-secondary">{t('freelance.edit.years_experience_label', lang)}</label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={YEARS_MAX}
                value={yearsExperience}
                onChange={(e) => setYearsT(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-text-secondary">{t('freelance.edit.years_suffix', lang)}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary">{t('freelance.edit.links_title', lang)}</p>
            <LinksRepeater rows={linkRows} onChange={setLinksT} lang={lang} />
          </div>
        </AccordionSection>

        <AccordionSection title={t('freelance.edit.about_title', lang)} complete={bio.trim().length >= 100} defaultOpen>
          <Textarea
            label={t('freelance.edit.bio_label', lang)}
            required
            counter
            maxLength={BIO_MAX}
            helper={t('freelance.edit.bio_helper', lang)}
            value={bio}
            onChange={(e) => setBioT(e.target.value)}
          />
          <FieldError show={publishMissing.includes('bio')} textKey="freelance.edit.error_bio" lang={lang} />
        </AccordionSection>

        <AccordionSection
          title={t('freelance.edit.skills_languages_title', lang)}
          complete={skills.length >= 3 && skills.length <= SKILLS_MAX}
          defaultOpen
        >
          <div>
            <TagInput
              value={skills}
              onChange={setSkillsT}
              max={SKILLS_MAX}
              label={t('freelance.edit.skills_label', lang)}
              helper={t('freelance.edit.skills_helper', lang)}
              getRemoveLabel={(s) => t('freelance.edit.remove_skill', lang, { name: s })}
            />
            <FieldError show={publishMissing.includes('skills')} textKey="freelance.edit.error_skills" lang={lang} />
          </div>

          <div className="border-t border-border-subtle pt-4">
            <p className="mb-2 text-sm font-medium text-text-secondary">{t('freelance.edit.languages_title', lang)}</p>
            <p className="mb-2 text-sm text-text-muted">{t('freelance.edit.languages_helper', lang)}</p>
            <LanguageRepeater rows={languageRows} onChange={setLanguagesT} lang={lang} />
          </div>

          <div className="border-t border-border-subtle pt-4">
            <TagInput
              value={tools}
              onChange={setToolsT}
              max={15}
              label={t('freelance.edit.tools_label', lang)}
              helper={t('freelance.edit.tools_helper', lang)}
              getRemoveLabel={(name) => t('freelance.edit.remove_tool', lang, { name })}
            />
          </div>
        </AccordionSection>

        <AccordionSection title={t('freelance.edit.portfolio_title', lang)} complete={portfolioRows.length > 0}>
          <PortfolioRepeater rows={portfolioRows} onChange={setPortfolioT} lang={lang} />
        </AccordionSection>

        <AccordionSection title={t('freelance.edit.services_title', lang)} complete>
          <p className="text-sm text-text-muted">{t('freelance.edit.services_body', lang)}</p>
          <a href="/mes-services" className="w-fit rounded text-sm font-medium text-brand-blue-600 hover:underline">
            {t('freelance.edit.services_link', lang)}
          </a>
        </AccordionSection>

        <AccordionSection title={t('freelance.edit.formation_title', lang)} complete={educationRows.length > 0 || certificationRows.length > 0}>
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">{t('freelance.edit.education_title', lang)}</p>
            <p className="mb-2 text-sm text-text-muted">{t('freelance.edit.education_helper', lang)}</p>
            <EducationRepeater rows={educationRows} onChange={setEducationT} lang={lang} />
          </div>
          <div className="border-t border-border-subtle pt-4">
            <p className="mb-2 text-sm font-medium text-text-secondary">{t('freelance.edit.certifications_title', lang)}</p>
            <p className="mb-2 text-sm text-text-muted">{t('freelance.edit.certifications_helper', lang)}</p>
            <CertificationRepeater rows={certificationRows} onChange={setCertificationsT} lang={lang} />
          </div>
        </AccordionSection>

        <AccordionSection title={t('freelance.edit.context_title', lang)} complete={workingHours.trim().length > 0 || workplaceLocation.trim().length > 0}>
          <Textarea
            label={t('freelance.edit.working_hours_label', lang)}
            maxLength={WORKING_HOURS_MAX}
            counter
            value={workingHours}
            onChange={(e) => setHoursT(e.target.value)}
          />
          <Input
            label={t('freelance.edit.workplace_location_label', lang)}
            maxLength={WORKPLACE_LOCATION_MAX}
            value={workplaceLocation}
            onChange={(e) => setLocationT(e.target.value)}
          />
        </AccordionSection>
      </div>

      <ValidationBanner missing={publishMissing} lang={lang} />

      {publishNotice === 'published' ? (
        <p role="status" className="rounded-lg border border-success-500 bg-success-50 p-4 text-sm text-success-700">
          {t('freelance.edit.publish_success', lang)}
        </p>
      ) : null}
      {publishNotice === 'needs_listing' ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-brand-blue-600 bg-brand-blue-50 p-4 text-sm text-text-primary">
          <p>{t('freelance.edit.publish_needs_listing', lang)}</p>
          <a href="/mes-services" className="w-fit font-medium text-brand-blue-600 hover:underline">
            {t('freelance.edit.publish_needs_listing_link', lang)}
          </a>
        </div>
      ) : null}
      {formError ? (
        <p role="alert" className="text-sm text-danger-500">
          {formError}
        </p>
      ) : null}

      <StickyFooter
        lang={lang}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
        canPublish={canPublish}
        previewHref="/mes-services"
        onSave={onSave}
        onPublish={onPublish}
      />
    </div>
  )
}
