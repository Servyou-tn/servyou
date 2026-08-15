'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'

// H2 "Créer mon profil freelance" step 1. Full reasoning: docs/design/h2-discovery.md.
//
// ⚑ seller_type FLIPS BEFORE THE freelancer_profiles INSERT, in the same action, not the
// reverse — same reasoning as G2's createShopAction (ma-boutique/creer/actions.ts:29-35). If
// the insert happened first and the seller_type UPDATE failed afterward (the age-gate trigger,
// 23514), the account would hold a profile row while still reading as consumer — a state
// nothing in the app handles. Flipping first means the only way a profile-less flip can happen
// is a race the pre-check below misses, which lands on "freelancer with no profile" — a state
// the page guard already names and handles (resolveOwnedFreelancerProfileId's 'no_profile').
//
// ⚑ full_name RIDES ALONG IN THE SAME UPDATE AS seller_type, not a separate write. The measured
// frame's "Nom complet" field is pre-filled from the account and editable (docs/design/
// h2-discovery.md §2b) — there is no freelancer-scoped name column, profiles.full_name is the
// only one, and it is the same column /mon-compte's updateProfileAction writes. Bundling it into
// the seller_type UPDATE keeps this to one round trip and one place the age-gate trigger fires.
//
// Avatar is NOT handled here. It targets profiles.avatar_url via the existing
// uploadAvatarAction (mon-compte/actions.ts) — no shopId-style ordering dependency, so
// AvatarField calls that action directly and independently of this one.

const HEADLINE_MAX = 100
const BIO_MIN = 100
const BIO_MAX = 2000
const NAME_MAX = 100

export type CreateFreelancerProfileResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'fullName' | 'headline' | 'bio' | 'city' }

const CreateFreelancerProfileInput = z.object({
  fullName: z.string().trim().min(1).max(NAME_MAX),
  headline: z.string().trim().min(1).max(HEADLINE_MAX),
  bio: z.string().trim().min(BIO_MIN).max(BIO_MAX),
  city: z.string().trim().min(1),
})

export async function createFreelancerProfileAction(input: unknown): Promise<CreateFreelancerProfileResult> {
  const lang = await getLang()
  const parsed = CreateFreelancerProfileInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      `[createFreelancerProfile] rejected: input failed validation — ` +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = issue?.path[0]
    if (field === 'fullName') return { ok: false, error: t('freelance.create.error.name_required', lang), field: 'fullName' }
    if (field === 'headline') return { ok: false, error: t('freelance.create.error.headline_required', lang), field: 'headline' }
    if (field === 'bio') return { ok: false, error: t('freelance.create.error.bio_min', lang, { min: BIO_MIN }), field: 'bio' }
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { fullName, headline, bio, city } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('freelance.create.error.notAuth', lang) }

  if (!GOVERNORATES.some((g) => g.value === city)) {
    return { ok: false, error: t('common.error_generic', lang), field: 'city' }
  }

  // Defense in depth — the page guard already keeps an existing shop owner out of this form, but
  // a server action must re-derive rather than trust the render.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('seller_type')
    .eq('id', user.id)
    .single()
  if (profileErr) {
    console.error('[createFreelancerProfile] profile fetch failed:', profileErr.message, profileErr.code, profileErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (profile.seller_type === 'shop_owner') {
    console.error(`[createFreelancerProfile] rejected: user ${user.id} is seller_type=shop_owner — switch flow does not exist`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const existing = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!existing.ok && existing.reason === 'query_failed') {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // full_name rides along unconditionally, same write whether this is a fresh submit or a
  // revisit. On a fresh submit this UPDATE is the seller_type flip (consumer -> freelancer); on a
  // revisit (existing.ok — "Retour" from step 2, or coming back before finishing it) seller_type
  // is already 'freelancer', so this re-sets the same value. That matters for the age-gate
  // trigger (enforce_seller_type_age_gate, 23514): it only re-checks age when `new.seller_type IS
  // DISTINCT FROM old.seller_type`, so a same-value re-set on a revisit is a verified no-op for
  // that trigger, not a second age check against a user who already passed it once.
  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ seller_type: 'freelancer', full_name: fullName })
    .eq('id', user.id)
  if (roleErr) {
    console.error('[createFreelancerProfile] seller_type update failed:', roleErr.message, roleErr.code, roleErr.details)
    if (roleErr.code === '23514') {
      return { ok: false, error: t('freelance.create.error.age_gate', lang) }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  if (existing.ok) {
    // Revisit — UPDATE, not INSERT, the row already exists. The page guard
    // (mon-profil-freelance/creer/page.tsx) only renders this form pre-filled when
    // freelancer_languages has no row yet for this profile (i.e. step 2 was never finished), so
    // reaching this branch means the earlier reject-on-existing behavior would have wrongly
    // blocked a legitimate "Retour" resubmit.
    const { error: updErr } = await supabase
      .from('freelancer_profiles')
      .update({ headline, bio, city })
      .eq('id', existing.freelancerProfileId)
    if (updErr) {
      console.error('[createFreelancerProfile] update failed:', updErr.message, updErr.code, updErr.details)
      return { ok: false, error: t('common.error_generic', lang) }
    }
    revalidatePath('/tableau-de-bord')
    revalidatePath('/mon-profil-freelance/creer')
    return { ok: true }
  }

  const { error: insErr } = await supabase
    .from('freelancer_profiles')
    .insert({ profile_id: user.id, headline, bio, city })
  if (insErr) {
    console.error('[createFreelancerProfile] insert failed:', insErr.message, insErr.code, insErr.details)
    // 23505 — profile_id is unique; a race the pre-check missed (two concurrent submits).
    // seller_type is already 'freelancer' with no profile: not rolled back — same shape as
    // G2's own name-collision race (ma-boutique/creer/actions.ts:143-146), and the page guard's
    // 'no_profile' branch is the way back to it.
    if (insErr.code === '23505') {
      return { ok: false, error: t('common.error_generic', lang) }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // /tableau-de-bord, not -vendeur — see the matching note on page.tsx's guard for why.
  revalidatePath('/tableau-de-bord')
  return { ok: true }
}
