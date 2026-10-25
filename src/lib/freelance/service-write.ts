import type { SupabaseClient } from '@supabase/supabase-js'
import type { WizardField } from './service-draft'
import type { ServiceField } from './service-validation'

// Shared by the two writers of a service from the wizard: saveServiceDraftAction / publishServiceDraftAction
// (H6, app/mes-services/creer/actions.ts) and updateServiceAction (H7, app/mes-services/[id]/modifier/actions.ts).
// A plain module — a 'use server' file may export only async functions.

/** validateServiceInput's fields → the wizard field that edits each (null: not a wizard field). */
export const VALIDATOR_FIELD: Record<ServiceField, WizardField | null> = {
  title: 'title',
  category: 'sector',
  subcategory: 'subcategory',
  tags: 'skills',
  shortDescription: 'shortDescription',
  description: 'description',
  price: 'price',
  priceUnit: 'priceUnit',
  delivery: 'deliveryTime',
  deliverables: 'deliverables',
  deliveryMode: 'deliveryMode',
  briefing: 'buyerBriefing',
  revisions: null,
  status: null,
}

/** The DB gate's detail (service_listings columns) → the wizard field that edits each. */
export const COLUMN_FIELD: Record<string, WizardField> = {
  title: 'title',
  category_id: 'sector',
  subcategory_id: 'subcategory',
  tags: 'skills',
  short_description: 'shortDescription',
  description: 'description',
  starting_price_tnd: 'price',
  price_unit: 'priceUnit',
  deliverables: 'deliverables',
  delivery_mode: 'deliveryMode',
}

/** The failing wizard fields named by a trg_service_publish_requirements refusal (detail = columns). */
export function gateRefusalFields(details: string | null | undefined): WizardField[] {
  return (details ?? '')
    .split(',')
    .map((column) => COLUMN_FIELD[column.trim()])
    .filter((f): f is WizardField => f !== undefined)
}

export type CategoryResolution =
  | { ok: true; categoryId: string | null; subcategoryId: string | null }
  | { ok: false; reason: 'query_failed' | 'unavailable' }

/**
 * The wizard's TS-taxonomy slugs → the DB's category uuids. An empty pair resolves to nulls (a draft may
 * not have reached the category fields yet). A pair that is not in `categories`, or is re-parented there,
 * is refused — never guessed. `tag` prefixes the log lines (the calling action's name).
 */
export async function resolveCategoryIds(
  supabase: SupabaseClient,
  sectorId: string,
  subcategoryId: string,
  tag: string,
): Promise<CategoryResolution> {
  const slugs = [sectorId, subcategoryId].filter(Boolean)
  if (slugs.length === 0) return { ok: true, categoryId: null, subcategoryId: null }

  const { data: cats, error } = await supabase
    .from('categories')
    .select('id, slug, parent_id')
    .eq('kind', 'service')
    .in('slug', slugs)
  if (error) {
    console.error(`[${tag}] category lookup failed:`, error.message, error.code, error.details)
    return { ok: false, reason: 'query_failed' }
  }
  const sector = (cats ?? []).find((c) => c.slug === sectorId && c.parent_id === null)
  const sub = subcategoryId ? (cats ?? []).find((c) => c.slug === subcategoryId) : undefined
  // In the TS taxonomy but not (or no longer) in the DB, or re-parented there: refuse, don't guess.
  if (!sector || (subcategoryId && (!sub || sub.parent_id !== sector.id))) {
    console.error(`[${tag}] category pair ${sectorId}/${subcategoryId} not found in categories`)
    return { ok: false, reason: 'unavailable' }
  }
  return { ok: true, categoryId: sector.id as string, subcategoryId: sub ? (sub.id as string) : null }
}
