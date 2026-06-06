// Freelancer configuration types — matches the freelancer_profiles
// schema in production AFTER the freelancer_configurable_workspace
// migration (20260606212937) added working_hours, current_workplace,
// and preferred_payment_method columns. Also includes interfaces for
// the 3 child tables (freelancer_tools, freelancer_education,
// freelancer_certifications) which PR-H1 does NOT surface yet —
// those come in PR-H2 — but exporting the types now means PR-H2 can
// use them without re-touching this file.

export interface FreelancerProfile {
  id: string
  profile_id: string
  headline: string | null
  bio: string | null
  city: string | null
  portfolio_link: string | null
  years_experience: number | null
  languages: string | null
  working_hours: string | null
  current_workplace: string | null
  preferred_payment_method: string | null
  created_at: string
  updated_at: string
}

export interface FreelancerTool {
  id?: string
  freelancer_id: string
  name: string
}

export interface FreelancerEducation {
  id?: string
  freelancer_id: string
  institution: string
  degree: string | null
  field: string | null
  year_start: number | null
  year_end: number | null
}

export interface FreelancerCertification {
  id?: string
  freelancer_id: string
  name: string
  issuing_org: string | null
  year_obtained: number | null
  credential_url: string | null
}

// Form-state row shapes used by FreelancerForm and its child-table editors.
// Distinct from the DB interfaces above: optional text columns are '' (not
// null) in form state so they bind to controlled inputs; year columns stay
// number | null. Conversion to/from the DB null-form happens in FreelancerForm.
export interface ToolRow {
  id?: string
  name: string
}

export interface EducationRow {
  id?: string
  institution: string
  degree: string
  field: string
  year_start: number | null
  year_end: number | null
}

export interface CertificationRow {
  id?: string
  name: string
  issuing_org: string
  year_obtained: number | null
  credential_url: string
}
