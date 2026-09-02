import { z } from 'zod'

// H2 step 3 "Détails" input schema — split out of actions.ts because a 'use server' file may only
// export async functions (Next.js constraint); this schema is also imported directly by tests
// (cap boundaries, anchor enforcement, empty-is-valid) without needing a live request context.
//
// Figma 468:20502 measured the four accordion HEADERS only; the bodies were never authored in the
// file. Field shapes below are a FOUNDER RULING off the known schema, not a measurement — see the
// PR description for the exact FR strings this ruling chose.

export const EDUCATION_CAP = 5
export const CERTIFICATIONS_CAP = 5
export const TOOLS_CAP = 15

export const INSTITUTION_MAX = 200
export const DEGREE_MAX = 150
export const FIELD_MAX = 150
export const CERT_NAME_MAX = 200
export const ISSUING_ORG_MAX = 200
export const TOOL_MAX_LEN = 60
export const WORKING_HOURS_MAX = 500
export const CREDENTIAL_URL_MAX = 500

export const YEAR_MIN = 1950
export const YEAR_MAX = new Date().getFullYear() + 1

// "Optional field, empty input collapses to null" — same convention competences/actions.ts uses
// for portfolioLink, applied to Formation/Certifications' non-anchor text fields.
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null)
const optionalYear = z.number().int().min(YEAR_MIN).max(YEAR_MAX).nullable()
// Same union-with-empty-literal shape as competences/actions.ts's portfolioLink — a bare URL
// input, not a required field.
const optionalUrl = z.union([z.string().trim().max(CREDENTIAL_URL_MAX).url(), z.literal('')]).transform((v) => v || null)

// "Required within a row" (institution / name) — a row only reaches the server once its own
// anchor field is non-empty; the client filters anchor-less rows out before submitting (mirrors
// LanguageRepeater's `language && proficiency` filter). The server still enforces `.min(1)` as
// defense in depth: a payload that somehow arrives with a blank anchor is rejected, not repaired.
const EducationRowInput = z.object({
  institution: z.string().trim().min(1).max(INSTITUTION_MAX),
  degree: optionalText(DEGREE_MAX),
  field: optionalText(FIELD_MAX),
  yearStart: optionalYear,
  yearEnd: optionalYear,
})

const CertificationRowInput = z.object({
  name: z.string().trim().min(1).max(CERT_NAME_MAX),
  issuingOrg: optionalText(ISSUING_ORG_MAX),
  yearObtained: optionalYear,
  credentialUrl: optionalUrl,
})

export const SaveDetailsInput = z.object({
  education: z.array(EducationRowInput).max(EDUCATION_CAP),
  certifications: z.array(CertificationRowInput).max(CERTIFICATIONS_CAP),
  tools: z.array(z.string().trim().min(1).max(TOOL_MAX_LEN)).max(TOOLS_CAP),
  // Always a string, never omitted — an untouched Textarea submits '' and that is itself
  // meaningful (see applyFreelancerDetailsSave's doc comment: NOT NULL after this write is the
  // step-3-reached signal the step-1 guard reads).
  workingHours: z.string().trim().max(WORKING_HOURS_MAX),
})

export type DetailsInput = z.infer<typeof SaveDetailsInput>
