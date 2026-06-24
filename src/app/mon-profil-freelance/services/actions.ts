'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateServiceInput, type ServiceInput } from '@/lib/freelance/service-validation'

// Unlike createMission (which redirects server-side), these RETURN the result so the client form can
// show a Sonner toast then router.push — the toast pattern used by parametres/mon-compte. Validation
// runs BEFORE createClient() so a malformed request never touches the DB; RLS re-validates ownership
// (freelancer_profiles.profile_id = auth.uid() on INSERT/UPDATE).
export type ServiceActionResult = { ok: true; id?: string } | { ok: false; errorKey: string }

const SERVER_ERROR = 'freelance.services.form.error.server'

function firstError(errors: Partial<Record<string, string>>): string {
  return Object.values(errors)[0] ?? SERVER_ERROR
}

// Resolve the caller's freelancer_profiles id (the value RLS requires on the row). Only freelancers
// have one, so its presence is the operative authorization gate (the pages also guard by role).
async function callerProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: fp, error } = await supabase
    .from('freelancer_profiles')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (error) console.error('[services-actions] profile lookup error:', error)
  return (fp as { id: string } | null)?.id ?? null
}

export async function createService(input: ServiceInput): Promise<ServiceActionResult> {
  const v = validateServiceInput(input)
  if (!v.ok) return { ok: false, errorKey: firstError(v.errors) }

  const supabase = await createClient()
  const fpId = await callerProfileId(supabase)
  if (!fpId) return { ok: false, errorKey: SERVER_ERROR }

  const { data, error } = await supabase
    .from('service_listings')
    .insert({
      freelancer_profile_id: fpId,
      title: v.value.title,
      category_id: v.value.category_id,
      description: v.value.description,
      starting_price_tnd: v.value.starting_price_tnd,
      delivery_time: v.value.delivery_time,
      status: v.value.status,
      deliverables: v.value.deliverables,
      revisions_count: v.value.revisions_count,
      tags: v.value.tags,
      buyer_briefing: v.value.buyer_briefing,
    })
    .select('id')

  if (error) {
    console.error('[services-actions] create error:', error)
    return { ok: false, errorKey: SERVER_ERROR }
  }
  if (!data || data.length === 0) {
    // RLS-blocked insert returns no row.
    return { ok: false, errorKey: SERVER_ERROR }
  }

  revalidatePath('/mon-profil-freelance/services')
  return { ok: true, id: (data[0] as { id: string }).id }
}

export async function updateService(
  serviceId: string,
  input: ServiceInput,
): Promise<ServiceActionResult> {
  const v = validateServiceInput(input)
  if (!v.ok) return { ok: false, errorKey: firstError(v.errors) }

  const supabase = await createClient()
  const fpId = await callerProfileId(supabase)
  if (!fpId) return { ok: false, errorKey: SERVER_ERROR }

  // The .eq('freelancer_profile_id', fpId) is the ownership scope (RLS also enforces it); a non-owned
  // id matches no row → empty data → surfaced as a generic error.
  const { data, error } = await supabase
    .from('service_listings')
    .update({
      title: v.value.title,
      category_id: v.value.category_id,
      description: v.value.description,
      starting_price_tnd: v.value.starting_price_tnd,
      delivery_time: v.value.delivery_time,
      status: v.value.status,
      deliverables: v.value.deliverables,
      revisions_count: v.value.revisions_count,
      tags: v.value.tags,
      buyer_briefing: v.value.buyer_briefing,
      // updated_at is owned by the service_listings_set_updated_at trigger (verified in discovery).
    })
    .eq('id', serviceId)
    .eq('freelancer_profile_id', fpId)
    .select('id')

  if (error) {
    console.error('[services-actions] update error:', error)
    return { ok: false, errorKey: SERVER_ERROR }
  }
  if (!data || data.length === 0) {
    return { ok: false, errorKey: SERVER_ERROR }
  }

  revalidatePath('/mon-profil-freelance/services')
  return { ok: true }
}
