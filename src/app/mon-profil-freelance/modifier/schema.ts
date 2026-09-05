import { z } from 'zod'
import { LANGUAGE_CODES, PROFICIENCY_CODES } from '@/lib/freelancer/language-options'
import {
  HEADLINE_MAX,
  BIO_MAX,
  SKILLS_MAX,
  LINKS_CAP,
  PORTFOLIO_CAP,
  EDUCATION_CAP,
  CERTIFICATIONS_CAP,
  TOOLS_CAP,
  YEARS_MAX,
  WORKING_HOURS_MAX,
  WORKPLACE_LOCATION_MAX,
} from '@/lib/marche/freelancer-profile-edit'

// H3 "Modifier mon profil" save — Enregistrer is deliberately UNGATED (same posture as G6's
// "Enregistrer le brouillon", docs/design/g6-write-path.md §6): no field here has a Zod `.min()`
// that would block saving an incomplete profile. The three publish-gate requirements (headline
// non-empty, bio >= 100 chars, 3-15 skills) live in freelancer-profile-edit.ts's
// validateForPublish(), run separately by publishProfileAction — never by this schema. Max-length
// caps ARE enforced here; those are data-integrity limits, not completeness rules.

const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null)
const optionalUrl = z.union([z.string().trim().max(500).url(), z.literal('')]).transform((v) => v || null)

const LinkRowInput = z.object({
  label: z.string().trim().min(1).max(100),
  url: z.string().trim().min(1).max(500).url(),
})

const PortfolioRowInput = z.object({
  imageUrl: z.string().trim().min(1).url(),
  title: optionalText(200),
  url: optionalUrl,
  description: optionalText(2000),
})

// One input, mapped to `degree` — the frame (404:12214, form-row 406:13799) draws institution +
// ONE text field + a year range, not institution + degree + field. `freelancer_education.field`
// stays unused by this form (founder ruling); see the PR description.
const EducationRowInput = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: optionalText(150),
  yearStart: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable(),
  yearEnd: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable(),
})

const CertificationRowInput = z.object({
  name: z.string().trim().min(1).max(200),
  issuingOrg: optionalText(200),
  yearObtained: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable(),
  credentialUrl: optionalUrl,
})

export const SaveProfileInput = z.object({
  headline: z.string().trim().max(HEADLINE_MAX),
  bio: z.string().trim().max(BIO_MAX),
  yearsExperience: z.number().int().min(0).max(YEARS_MAX),
  workingHours: z.string().trim().max(WORKING_HOURS_MAX),
  workplaceLocation: z.string().trim().max(WORKPLACE_LOCATION_MAX),
  skills: z.array(z.string().trim().min(1).max(60)).max(SKILLS_MAX),
  languages: z.array(z.object({ language: z.enum(LANGUAGE_CODES), proficiency: z.enum(PROFICIENCY_CODES) })).max(LANGUAGE_CODES.length),
  tools: z.array(z.string().trim().min(1).max(60)).max(TOOLS_CAP),
  links: z.array(LinkRowInput).max(LINKS_CAP),
  portfolio: z.array(PortfolioRowInput).max(PORTFOLIO_CAP),
  education: z.array(EducationRowInput).max(EDUCATION_CAP),
  certifications: z.array(CertificationRowInput).max(CERTIFICATIONS_CAP),
})

export type SaveProfileInputType = z.infer<typeof SaveProfileInput>
