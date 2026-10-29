'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { SetFavoriteInput, TARGET_COLUMN } from '@/lib/favorites/targets'

export type SetFavoriteResult = { ok: true } | { ok: false; error: string }

// Adds or removes the caller's favorite of a shop / freelancer. IDEMPOTENT by design (the client sends the state it wants, not a
// « toggle »): the optimistic heart can be double-tapped or retried and still lands where the user last pointed.
//   • user_id always comes from the SESSION — never the input; the INSERT / DELETE policies also pin it to auth.uid().
//   • INSERT's WITH CHECK requires the target to exist AND be visible to the caller (a hidden / suspended shop or freelancer is
//     refused by RLS), so a stale page cannot favorite something that has since been moderated away.
//   • a duplicate (23505, the per-user unique) means « already favorited » = the requested state → ok.
export async function setFavoriteAction(input: unknown): Promise<SetFavoriteResult> {
  const lang = await getLang()
  const generic = { ok: false as const, error: t('common.error_generic', lang) }

  const parsed = SetFavoriteInput.safeParse(input)
  if (!parsed.success) return generic
  const { kind, targetId, favorited } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('favorites.error_signin', lang) }

  const column = TARGET_COLUMN[kind]

  if (favorited) {
    const { error } = await supabase
      .from('favorites')
      .insert(
        kind === 'shop'
          ? { user_id: user.id, item_type: 'shop', shop_id: targetId }
          : { user_id: user.id, item_type: 'freelancer', freelancer_profile_id: targetId },
      )
    if (error && error.code !== '23505') {
      console.error('[setFavorite] insert error:', error.message, error.code, error.details)
      return generic
    }
  } else {
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_type', kind).eq(column, targetId)
    if (error) {
      console.error('[setFavorite] delete error:', error.message, error.code, error.details)
      return generic
    }
  }

  revalidatePath('/mes-favoris')
  return { ok: true }
}
