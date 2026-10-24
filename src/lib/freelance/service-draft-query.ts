import type { SupabaseClient } from '@supabase/supabase-js'
import { draftRowToForm, resumeStep, type DraftForm, type DraftRow, type ServiceWizardStep } from './service-draft'

// H6 silent resume (founder ruling, 2026-09-09; confirmed as D7 2026-10-23): /mes-services/creer
// reopens the freelancer's newest draft, with no banner and no link, on the first step its data
// doesn't pass yet.
//
// A failed query THROWS. It is never collapsed into "no draft": that would open an empty wizard,
// whose first autosave inserts a second draft, which is exactly the duplicate the resume rule then
// has to log.

export type ResumableDraft = { id: string; form: DraftForm; step: ServiceWizardStep }

export async function getResumableDraft(
  supabase: SupabaseClient,
  freelancerProfileId: string,
): Promise<ResumableDraft | null> {
  const { data, error } = await supabase
    .from('service_listings')
    .select('id, title, category_id, subcategory_id, tags, short_description, description')
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

  const categoryIds = [row.category_id, row.subcategory_id].filter((id): id is string => id !== null)
  const slugById = new Map<string, string>()
  if (categoryIds.length > 0) {
    const { data: cats, error: catError } = await supabase.from('categories').select('id, slug').in('id', categoryIds)
    if (catError) {
      console.error('[getResumableDraft] category lookup failed:', catError.message, catError.code, catError.details)
      throw new Error('service draft category lookup failed')
    }
    for (const c of cats ?? []) slugById.set(c.id as string, c.slug as string)
  }

  const form = draftRowToForm(row, slugById)
  return { id: row.id, form, step: resumeStep(form) }
}
