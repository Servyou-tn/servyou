import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { DRAFT_ROW_COLUMNS, draftRowToForm, resumeStep, type DraftForm, type DraftRow, type ServiceWizardStep } from './service-draft'

// H6 silent resume (founder ruling, 2026-09-09; confirmed as D7 2026-10-23): /mes-services/creer
// reopens the freelancer's newest draft, with no banner and no link, on the first step its data
// doesn't pass yet.
//
// A failed query THROWS. It is never collapsed into "no draft": that would open an empty wizard,
// whose first autosave inserts a second draft, which is exactly the duplicate the resume rule then
// has to log.

export type ResumableDraft = { id: string; form: DraftForm; step: ServiceWizardStep }

/** The slugs of the given category uuids — the wizard works in TS-taxonomy slugs, the row in uuids. */
async function categorySlugs(supabase: SupabaseClient, row: DraftRow, tag: string): Promise<Map<string, string>> {
  const categoryIds = [row.category_id, row.subcategory_id].filter((id): id is string => id !== null)
  const slugById = new Map<string, string>()
  if (categoryIds.length === 0) return slugById
  const { data: cats, error } = await supabase.from('categories').select('id, slug').in('id', categoryIds)
  if (error) {
    console.error(`[${tag}] category lookup failed:`, error.message, error.code, error.details)
    throw new Error('service draft category lookup failed')
  }
  for (const c of cats ?? []) slugById.set(c.id as string, c.slug as string)
  return slugById
}

export async function getResumableDraft(
  supabase: SupabaseClient,
  freelancerProfileId: string,
): Promise<ResumableDraft | null> {
  const { data, error } = await supabase
    .from('service_listings')
    .select(DRAFT_ROW_COLUMNS)
    .eq('freelancer_profile_id', freelancerProfileId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(2)

  if (error) {
    console.error('[getResumableDraft] fetch failed:', error.message, error.code, error.details)
    throw new Error('service draft fetch failed')
  }
  const rows = (data ?? []) as DraftRow[]
  if (rows.length === 0) return null

  // Two tabs racing their first save, or a draft from before the client kept its id, can leave two.
  // Ids only, no content.
  if (rows.length > 1) {
    console.warn(
      `[getResumableDraft] freelancer_profile ${freelancerProfileId} has more than one draft; resuming ${rows[0].id}, also found ${rows[1].id}`,
    )
  }
  const row = rows[0]

  const form = draftRowToForm(row, await categorySlugs(supabase, row, 'getResumableDraft'))
  return { id: row.id, form, step: resumeStep(form) }
}

// ── H7 « Modifier un service » ──────────────────────────────────────────────────────────────────

export type EditableService = {
  id: string
  status: 'draft' | 'active' | 'hidden'
  /** admin_hidden_at — set means the moderation hid it: the owner may look, never write. */
  adminHiddenAt: string | null
  form: DraftForm
  /** Where the wizard opens: the first step the saved data doesn't pass, else the récapitulatif. */
  step: ServiceWizardStep
}

const ServiceIdSchema = z.string().uuid()

/**
 * One of THIS freelancer's services (any status) as a wizard form, or null when the id is malformed,
 * unknown, or somebody else's — the caller 404s on null, so the three are indistinguishable (the response
 * can't be used to probe which ids exist). A failed query THROWS, never reads as "not found".
 */
export async function getServiceForEdit(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  serviceId: string,
): Promise<EditableService | null> {
  // A malformed id would otherwise reach PostgREST as a 22P02 and 500 instead of 404.
  if (!ServiceIdSchema.safeParse(serviceId).success) return null

  const { data, error } = await supabase
    .from('service_listings')
    .select(`${DRAFT_ROW_COLUMNS}, status, admin_hidden_at`)
    .eq('id', serviceId)
    .eq('freelancer_profile_id', freelancerProfileId)
    .maybeSingle()
  if (error) {
    console.error('[getServiceForEdit] fetch failed:', error.message, error.code, error.details)
    throw new Error('service fetch failed')
  }
  if (!data) return null

  const row = data as unknown as DraftRow & { status: string; admin_hidden_at: string | null }
  if (row.status !== 'draft' && row.status !== 'active' && row.status !== 'hidden') {
    console.error(`[getServiceForEdit] service ${serviceId} has an unexpected status`)
    return null
  }
  const form = draftRowToForm(row, await categorySlugs(supabase, row, 'getServiceForEdit'))
  return { id: row.id, status: row.status, adminHiddenAt: row.admin_hidden_at, form, step: resumeStep(form) }
}
