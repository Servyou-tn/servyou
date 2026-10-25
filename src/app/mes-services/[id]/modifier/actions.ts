'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import {
  DraftInputSchema,
  normalizeSkills,
  parsePrice,
  splitDeliverables,
  type WizardField,
} from '@/lib/freelance/service-draft'
import { validateServiceInput, type ServiceField } from '@/lib/freelance/service-validation'
import { revalidateServiceSurfaces } from '@/lib/freelance/service-revalidate'
import { VALIDATOR_FIELD, gateRefusalFields, resolveCategoryIds } from '@/lib/freelance/service-write'
import { getSector, getSubcategory } from '@/lib/taxonomy/service-categories'
import { z } from 'zod'

// H7 « Modifier un service » — saves the wizard's form onto a LIVE or PAUSED service
// (docs/design/h7-deltas.md). Returns i18n KEYS, not text (reference_i18n_store_keys_not_text).
//
// What makes this different from the H6 autosave (saveServiceDraftAction), and why:
//   • It runs validateServiceInput on the whole submitted form, with the row's CURRENT status. A live
//     listing is never written half-edited, and a draft is never written here at all.
//   • It never writes `status` (saving can't publish, pause or unpause) or `revisions_count` (the wizard
//     has no field for it; the validator's default of 1 must not overwrite a legacy row's value).
//   • The UPDATE is scoped to (id, owner, status in active/hidden, admin_hidden_at is null). The
//     moderation-lock trigger only stops a moderated row's STATUS from changing — field edits would pass —
//     so the lock on content is enforced here, not only by the read-only page.
//   • The DB re-checks the changed columns on a non-draft row (trg_service_publish_requirements); its
//     refusal (hint service_publish_requirements, detail = columns) maps to wizard fields exactly like the
//     H6 publish refusal.
// Ownership is re-derived from the session, never taken from the client.

const UpdateServiceInputSchema = DraftInputSchema.omit({ draftId: true }).extend({ serviceId: z.string().uuid() })

/** The draft schema's input keys → the wizard field a Zod refusal should flag on the récap. */
const INPUT_FIELD: Record<string, WizardField> = {
  title: 'title',
  sectorId: 'sector',
  subcategoryId: 'subcategory',
  skills: 'skills',
  shortDescription: 'shortDescription',
  description: 'description',
  price: 'price',
  priceUnit: 'priceUnit',
  deliveryTime: 'deliveryTime',
  deliverablesText: 'deliverables',
  deliveryMode: 'deliveryMode',
  buyerBriefing: 'buyerBriefing',
}

type UpdateServiceResult = { ok: true } | { ok: false; errorKey: string; fields: WizardField[] }

const ERR = {
  incomplete: 'service.edit.error.incomplete',
  failed: 'service.edit.error.save_failed',
  gone: 'service.edit.error.gone',
  session: 'service.wizard.error.session',
  category: 'service.wizard.error.category_unavailable',
  moderated: 'owner.moderation_banner.service',
} as const

export async function updateServiceAction(input: unknown): Promise<UpdateServiceResult> {
  const parsed = UpdateServiceInputSchema.safeParse(input)
  if (!parsed.success) {
    console.error('[updateService] rejected: invalid input —', parsed.error.issues[0]?.message)
    // A legacy value the step gates accept but the input caps don't (a custom skill over 50 characters, an
    // emoji-heavy title counted in UTF-16 units): name the row so the owner can fix it, not a dead-end retry.
    const fields = [...new Set(parsed.error.issues.map((i) => INPUT_FIELD[String(i.path[0])]).filter((f): f is WizardField => f !== undefined))]
    return fields.length > 0
      ? { ok: false, errorKey: ERR.incomplete, fields }
      : { ok: false, errorKey: ERR.failed, fields: [] }
  }
  const { serviceId, ...form } = parsed.data

  // A pair the taxonomy doesn't hold is refused before any DB work; an empty pair falls through to the
  // validator, which flags it as a missing field.
  if (form.sectorId && !getSector(form.sectorId)) return { ok: false, errorKey: ERR.category, fields: ['sector'] }
  if (form.subcategoryId && !getSubcategory(form.sectorId, form.subcategoryId)) {
    return { ok: false, errorKey: ERR.category, fields: ['subcategory'] }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[updateService] rejected: no authenticated user')
    return { ok: false, errorKey: ERR.session, fields: [] }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[updateService] freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, errorKey: ERR.failed, fields: [] }
  }

  // Independent reads, so one round trip: the row (status, moderation, stored mode) and the category pair.
  const [{ data: current, error: readError }, categories] = await Promise.all([
    supabase
      .from('service_listings')
      .select('id, status, admin_hidden_at, delivery_mode')
      .eq('id', serviceId)
      .eq('freelancer_profile_id', owned.freelancerProfileId)
      .maybeSingle(),
    resolveCategoryIds(supabase, form.sectorId, form.subcategoryId, 'updateService'),
  ])
  if (readError) {
    console.error('[updateService] read failed:', readError.message, readError.code, readError.details)
    return { ok: false, errorKey: ERR.failed, fields: [] }
  }
  // Unknown, somebody else's, or a draft (drafts are written by the autosave, never here).
  if (!current || (current.status !== 'active' && current.status !== 'hidden')) {
    console.error(`[updateService] no editable service ${serviceId} for freelancer_profile ${owned.freelancerProfileId}`)
    return { ok: false, errorKey: ERR.gone, fields: [] }
  }
  if (current.admin_hidden_at != null) {
    console.error(`[updateService] service ${serviceId} is admin-moderated; edit refused`)
    return { ok: false, errorKey: ERR.moderated, fields: [] }
  }

  if (!categories.ok) {
    return { ok: false, errorKey: categories.reason === 'unavailable' ? ERR.category : ERR.failed, fields: [] }
  }

  const price = parsePrice(form.price)
  const validation = validateServiceInput({
    title: form.title,
    categoryId: categories.categoryId ?? '',
    subcategoryId: categories.subcategoryId ?? '',
    description: form.description,
    shortDescription: form.shortDescription,
    startingPrice: price === null ? '' : String(price),
    priceUnit: form.priceUnit,
    deliveryTime: form.deliveryTime,
    deliveryMode: form.deliveryMode,
    status: current.status,
    // Uncapped on purpose: the validator has to see a 9th line to refuse it.
    deliverables: splitDeliverables(form.deliverablesText),
    revisions: '',
    // Re-normalized here, not trusted from the client: a pool label becomes its id, duplicates go.
    tags: normalizeSkills(form.skills, form.sectorId),
    buyerBriefing: form.buyerBriefing,
  })
  if (!validation.ok) {
    const failing = Object.keys(validation.errors) as ServiceField[]
    console.error(`[updateService] service ${serviceId} fails the publish rules: ${failing.join(',')}`)
    const fields = failing.map((f) => VALIDATOR_FIELD[f]).filter((f): f is WizardField => f !== null)
    return { ok: false, errorKey: ERR.incomplete, fields }
  }

  // Neither status nor revisions_count — see the header.
  const v = validation.value
  const { data: updated, error } = await supabase
    .from('service_listings')
    .update({
      title: v.title,
      category_id: v.category_id,
      subcategory_id: v.subcategory_id,
      tags: v.tags,
      short_description: v.short_description,
      description: v.description,
      starting_price_tnd: v.starting_price_tnd,
      price_unit: v.price_unit,
      delivery_time: v.delivery_time,
      deliverables: v.deliverables,
      // H6 offers remote / hybrid only, and an `onsite` row reads as « Sur site possible » (ruling D15): saving
      // that unchanged form must not rewrite the stored `onsite` as `hybrid`.
      delivery_mode: current.delivery_mode === 'onsite' && v.delivery_mode === 'hybrid' ? 'onsite' : v.delivery_mode,
      buyer_briefing: v.buyer_briefing,
    })
    .eq('id', serviceId)
    .eq('freelancer_profile_id', owned.freelancerProfileId)
    .in('status', ['active', 'hidden'])
    .is('admin_hidden_at', null)
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[updateService] update failed:', error.message, error.code, error.details, error.hint)
    if (error.hint === 'service_publish_requirements') {
      return { ok: false, errorKey: ERR.incomplete, fields: gateRefusalFields(error.details) }
    }
    return { ok: false, errorKey: ERR.failed, fields: [] }
  }
  // Deleted, moderated or turned into a draft between the read and this write.
  if (!updated) {
    console.error(`[updateService] service ${serviceId} was no longer editable at write`)
    return { ok: false, errorKey: ERR.gone, fields: [] }
  }

  // /services/[id] is dynamic (rendered per request), so there is no cached copy of it to revalidate.
  revalidateServiceSurfaces(owned.freelancerProfileId)
  return { ok: true }
}
