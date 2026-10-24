'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { DraftInputSchema, normalizeSkills } from '@/lib/freelance/service-draft'
import { getSector, getSubcategory } from '@/lib/taxonomy/service-categories'

// H6 « Créer un service » autosave. Returns i18n KEYS, not text: the wizard keeps the key in state
// and translates at render (reference_i18n_store_keys_not_text).
//
// ⚠ FOUNDER RULING (2026-09-09, reconfirmed 2026-10-23): a draft is written with status='draft'
// DIRECTLY and does NOT go through validateServiceInput. That function rejects 'draft' on purpose
// and checks a publishable service; a draft that had to pass it couldn't be a draft. Its only caller
// will be the « Publier mon service » step (PR-4). Do not "fix" this by routing drafts through it.
//
// What still holds for every write:
//   • ownership is re-derived here from the session, never taken from the client;
//   • the status is always 'draft' — on insert, and as a filter on update, so this action can never
//     touch a live or paused service;
//   • the category pair is checked against the TS taxonomy (the wizard's source of truth, which
//     keeps out the DB-only `maison` row) and then resolved slug → uuid in the DB;
//   • RLS (owner-only INSERT/UPDATE) and trg_enforce_service_subcategory_parent back all of it.
// No revalidatePath: a draft appears on no H5, dashboard or public surface.

type SaveDraftResult = { ok: true; draftId: string } | { ok: false; errorKey: string }

const ERR = {
  generic: 'service.wizard.error.save_failed',
  session: 'service.wizard.error.session',
  category: 'service.wizard.error.category_unavailable',
  gone: 'service.wizard.error.draft_gone',
} as const

export async function saveServiceDraftAction(input: unknown): Promise<SaveDraftResult> {
  const parsed = DraftInputSchema.safeParse(input)
  if (!parsed.success) {
    console.error('[saveServiceDraft] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, errorKey: ERR.generic }
  }
  const draft = parsed.data

  // A subcategory without its sector, or a pair the taxonomy doesn't hold, is refused before any DB
  // work. An empty pair is fine: a draft may not have reached the category fields yet.
  if (draft.sectorId && !getSector(draft.sectorId)) return { ok: false, errorKey: ERR.category }
  if (draft.subcategoryId && !getSubcategory(draft.sectorId, draft.subcategoryId)) return { ok: false, errorKey: ERR.category }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[saveServiceDraft] rejected: no authenticated user')
    return { ok: false, errorKey: ERR.session }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[saveServiceDraft] freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, errorKey: ERR.generic }
  }

  let categoryId: string | null = null
  let subcategoryId: string | null = null
  const slugs = [draft.sectorId, draft.subcategoryId].filter(Boolean)
  if (slugs.length > 0) {
    const { data: cats, error } = await supabase
      .from('categories')
      .select('id, slug, parent_id')
      .eq('kind', 'service')
      .in('slug', slugs)
    if (error) {
      console.error('[saveServiceDraft] category lookup failed:', error.message, error.code, error.details)
      return { ok: false, errorKey: ERR.generic }
    }
    const sector = (cats ?? []).find((c) => c.slug === draft.sectorId && c.parent_id === null)
    const sub = draft.subcategoryId ? (cats ?? []).find((c) => c.slug === draft.subcategoryId) : undefined
    // In the TS taxonomy but not (or no longer) in the DB, or re-parented there: refuse, don't guess.
    if (!sector || (draft.subcategoryId && (!sub || sub.parent_id !== sector.id))) {
      console.error(`[saveServiceDraft] category pair ${draft.sectorId}/${draft.subcategoryId} not found in categories`)
      return { ok: false, errorKey: ERR.category }
    }
    categoryId = sector.id as string
    subcategoryId = sub ? (sub.id as string) : null
  }

  const row = {
    title: draft.title,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    // Re-normalized here, not trusted from the client: a pool label becomes its id, duplicates go.
    tags: normalizeSkills(draft.skills, draft.sectorId),
    short_description: draft.shortDescription.trim() || null,
    description: draft.description.trim() || null,
    status: 'draft' as const,
  }

  if (draft.draftId) {
    const { data, error } = await supabase
      .from('service_listings')
      .update(row)
      .eq('id', draft.draftId)
      .eq('freelancer_profile_id', owned.freelancerProfileId)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('[saveServiceDraft] update failed:', error.message, error.code, error.details)
      return { ok: false, errorKey: error.code === '23514' ? ERR.category : ERR.generic }
    }
    // Deleted, published, or not this freelancer's — never fall through to an insert.
    if (!data) {
      console.error(`[saveServiceDraft] no draft ${draft.draftId} for freelancer_profile ${owned.freelancerProfileId}`)
      return { ok: false, errorKey: ERR.gone }
    }
    return { ok: true, draftId: data.id as string }
  }

  const { data, error } = await supabase
    .from('service_listings')
    .insert({ ...row, freelancer_profile_id: owned.freelancerProfileId })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[saveServiceDraft] insert failed:', error?.message, error?.code, error?.details)
    return { ok: false, errorKey: error?.code === '23514' ? ERR.category : ERR.generic }
  }
  return { ok: true, draftId: data.id as string }
}
