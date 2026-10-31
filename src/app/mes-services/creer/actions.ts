'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import {
  DRAFT_ROW_COLUMNS,
  DraftInputSchema,
  draftDeliverables,
  normalizeSkills,
  parsePrice,
  type DraftRow,
  type WizardField,
} from '@/lib/freelance/service-draft'
import { validateServiceInput, type ServiceField, type ServiceInput } from '@/lib/freelance/service-validation'
import { VALIDATOR_FIELD, gateRefusalFields, resolveCategoryIds } from '@/lib/freelance/service-write'
import { revalidateServiceSurfaces } from '@/lib/freelance/service-revalidate'
import { getSector, getSubcategory } from '@/lib/taxonomy/service-categories'

// H6 « Créer un service » autosave. Returns i18n KEYS, not text: the wizard keeps the key in state
// and translates at render (reference_i18n_store_keys_not_text).
//
// ⚠ FOUNDER RULING (2026-09-09, reconfirmed 2026-10-23): a draft is written with status='draft'
// DIRECTLY and does NOT go through validateServiceInput. That function rejects 'draft' on purpose
// and checks a publishable service; a draft that had to pass it couldn't be a draft. Its only caller
// is the « Publier mon service » step (publishServiceDraftAction, below). Do not "fix" this by routing
// drafts through it.
//
// What still holds for every write:
//   • ownership is re-derived here from the session, never taken from the client;
//   • the status is always 'draft' — on insert, and as a filter on update, so this action can never
//     touch a live or paused service;
//   • the category pair is checked against the TS taxonomy (the wizard's source of truth, which
//     keeps out the DB-only `maison` row) and then resolved slug → uuid in the DB;
//   • steps 3–4 never fail a save: a price that doesn't parse is written NULL (the step-3 gate
//     reports it), and « Ce qui est inclus » keeps its first 8 items (the DB CHECK's cap);
//   • RLS (owner-only INSERT/UPDATE) and trg_enforce_service_subcategory_parent back all of it.
// No revalidatePath: a draft appears on no H5, dashboard or public surface (publishing does — see
// publishServiceDraftAction).

type SaveDraftResult = { ok: true; draftId: string } | { ok: false; errorKey: string }

const ERR = {
  generic: 'service.wizard.error.save_failed',
  session: 'service.wizard.error.session',
  category: 'service.wizard.error.category_unavailable',
  gone: 'service.wizard.error.draft_gone',
  cap: 'service.wizard.error.cap_reached',
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

  const categories = await resolveCategoryIds(supabase, draft.sectorId, draft.subcategoryId, 'saveServiceDraft')
  if (!categories.ok) return { ok: false, errorKey: categories.reason === 'unavailable' ? ERR.category : ERR.generic }
  const { categoryId, subcategoryId } = categories

  const row = {
    title: draft.title,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    // Re-normalized here, not trusted from the client: a pool label becomes its id, duplicates go.
    tags: normalizeSkills(draft.skills, draft.sectorId),
    short_description: draft.shortDescription.trim() || null,
    description: draft.description.trim() || null,
    starting_price_tnd: parsePrice(draft.price),
    price_unit: draft.priceUnit,
    delivery_time: draft.deliveryTime.trim() || null,
    deliverables: draftDeliverables(draft.deliverablesText),
    delivery_mode: draft.deliveryMode,
    buyer_briefing: draft.buyerBriefing.trim() || null,
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
    // The 20-services-per-freelancer cap (trg_limit_services_per_freelancer) shares 23514 with the category check:
    // its hint decides, first.
    if (error?.hint === 'services_per_freelancer_cap') return { ok: false, errorKey: ERR.cap }
    return { ok: false, errorKey: error?.code === '23514' ? ERR.category : ERR.generic }
  }
  return { ok: true, draftId: data.id as string }
}

// ── « Publier mon service » (H6 step 5, PR-4 — docs/design/h6-pr4-deltas.md §2, ruling D29) ──────────
//
// Publishes what is SAVED, not what the client sends: the wizard flushes its autosave first, then
// passes only the draft id. The draft is re-read here (id + owner + status 'draft'), run through
// validateServiceInput — the G4 publish rules, its first production caller — and written back with
// status 'active' in one UPDATE that is itself filtered on status 'draft', so a double click or a
// second tab can't publish twice. The DB checks the same rules when a row leaves draft
// (trg_service_publish_requirements, migration 20261024215730); its refusal carries the hint
// 'service_publish_requirements' and the failing columns as detail (errcode 23514 is shared with the
// subcategory trigger, hence the hint).
//
// A refusal returns the failing WIZARD fields, so the récapitulatif can flag its rows and « Modifier »
// can open the step whose own gate explains each one — the validator's keys are never the message.

const PublishInputSchema = z.object({ draftId: z.string().uuid() })

type PublishResult = { ok: true; serviceId: string } | { ok: false; errorKey: string; fields: WizardField[] }

type PublishRow = DraftRow & { revisions_count: number | null }

const PUBLISH_ERR = {
  incomplete: 'service.wizard.error.publish_incomplete',
  failed: 'service.wizard.error.publish_failed',
} as const

function rowToServiceInput(row: PublishRow): ServiceInput {
  return {
    title: row.title ?? '',
    categoryId: row.category_id ?? '',
    subcategoryId: row.subcategory_id ?? '',
    description: row.description ?? '',
    shortDescription: row.short_description ?? '',
    startingPrice: row.starting_price_tnd == null ? '' : String(row.starting_price_tnd),
    priceUnit: row.price_unit ?? '',
    deliveryTime: row.delivery_time ?? '',
    deliveryMode: row.delivery_mode ?? '',
    status: 'active',
    deliverables: row.deliverables ?? [],
    revisions: row.revisions_count == null ? '' : String(row.revisions_count),
    tags: row.tags ?? [],
    buyerBriefing: row.buyer_briefing ?? '',
  }
}

export async function publishServiceDraftAction(input: unknown): Promise<PublishResult> {
  const parsed = PublishInputSchema.safeParse(input)
  if (!parsed.success) {
    console.error('[publishServiceDraft] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, errorKey: PUBLISH_ERR.failed, fields: [] }
  }
  const { draftId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[publishServiceDraft] rejected: no authenticated user')
    return { ok: false, errorKey: ERR.session, fields: [] }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[publishServiceDraft] freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, errorKey: PUBLISH_ERR.failed, fields: [] }
  }

  const { data: row, error: readError } = await supabase
    .from('service_listings')
    .select(`${DRAFT_ROW_COLUMNS}, revisions_count`)
    .eq('id', draftId)
    .eq('freelancer_profile_id', owned.freelancerProfileId)
    .eq('status', 'draft')
    .maybeSingle()
  if (readError) {
    console.error('[publishServiceDraft] draft read failed:', readError.message, readError.code, readError.details)
    return { ok: false, errorKey: PUBLISH_ERR.failed, fields: [] }
  }
  // Deleted, already published, or not this freelancer's.
  if (!row) {
    console.error(`[publishServiceDraft] no draft ${draftId} for freelancer_profile ${owned.freelancerProfileId}`)
    return { ok: false, errorKey: ERR.gone, fields: [] }
  }

  const validation = validateServiceInput(rowToServiceInput(row as unknown as PublishRow))
  if (!validation.ok) {
    const failing = Object.keys(validation.errors) as ServiceField[]
    console.error(`[publishServiceDraft] draft ${draftId} fails the publish rules: ${failing.join(',')}`)
    const fields = failing.map((f) => VALIDATOR_FIELD[f]).filter((f): f is WizardField => f !== null)
    return { ok: false, errorKey: PUBLISH_ERR.incomplete, fields }
  }

  const { data: published, error } = await supabase
    .from('service_listings')
    .update({ ...validation.value, status: 'active' as const })
    .eq('id', draftId)
    .eq('freelancer_profile_id', owned.freelancerProfileId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[publishServiceDraft] update failed:', error.message, error.code, error.details, error.hint)
    if (error.hint === 'service_publish_requirements') {
      return { ok: false, errorKey: PUBLISH_ERR.incomplete, fields: gateRefusalFields(error.details) }
    }
    return { ok: false, errorKey: PUBLISH_ERR.failed, fields: [] }
  }
  // Published (or deleted) from another tab between the read and this write.
  if (!published) {
    console.error(`[publishServiceDraft] draft ${draftId} was no longer a draft at publish`)
    return { ok: false, errorKey: ERR.gone, fields: [] }
  }

  revalidateServiceSurfaces(owned.freelancerProfileId)
  return { ok: true, serviceId: published.id as string }
}
