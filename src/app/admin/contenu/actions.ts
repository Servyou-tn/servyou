'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import { ADMIN_TEXT_MAX } from '@/lib/admin/action-input'

// J4 « Contenu » — Masquer / Réafficher straight from the content list, with no report attached. Same SECURITY
// DEFINER functions the report page uses (admin_hide_content / admin_unhide_content): they gate on is_admin(), log
// the audit row inside their own transaction and RAISE on every failure mode, so a null error means the state
// changed. Order: Zod first, then checkAdmin (a non-admin never reaches the RPC), then the RPC. Error values are
// i18n keys; the calling client component translates them.

export type ContentActionResult = { success: boolean; error?: string }

const TargetType = z.enum(['product', 'service', 'shop', 'freelancer_profile', 'job_post'])
const Target = z.object({ targetType: TargetType, targetId: z.string().uuid() })
const HideInput = Target.extend({ reason: z.string().trim() })

function translateModerationError(message: string): string {
  if (message.includes('Forbidden')) return 'admin.moderation.error_forbidden'
  if (message.includes('reason is required')) return 'admin.moderation.hide_reason_required'
  if (message.includes('already moderated')) return 'admin.moderation.error_already_moderated'
  if (message.includes('not currently moderated')) return 'admin.moderation.error_not_moderated'
  if (message.includes('Unsupported target_type')) return 'admin.moderation.error_unsupported_type'
  return 'common.error_generic'
}

export async function hideContentItem(targetType: string, targetId: string, reason: string): Promise<ContentActionResult> {
  const parsed = HideInput.safeParse({ targetType, targetId, reason })
  if (!parsed.success) return { success: false, error: 'common.error_generic' }
  const { reason: trimmed } = parsed.data
  if (trimmed.length === 0) return { success: false, error: 'admin.moderation.hide_reason_required' }
  if (trimmed.length > ADMIN_TEXT_MAX) return { success: false, error: 'admin.note_too_long' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/contenu] hideContentItem rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.moderation.error_forbidden') }
  }

  const { error } = await supabase.rpc('admin_hide_content', {
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: trimmed,
  })
  if (error) {
    console.error('[admin/contenu] hideContentItem error:', error.message, error.code, error.details)
    return { success: false, error: translateModerationError(error.message) }
  }
  revalidatePath('/admin/contenu')
  return { success: true }
}

export async function unhideContentItem(targetType: string, targetId: string): Promise<ContentActionResult> {
  const parsed = Target.safeParse({ targetType, targetId })
  if (!parsed.success) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/contenu] unhideContentItem rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.moderation.error_forbidden') }
  }

  const { error } = await supabase.rpc('admin_unhide_content', {
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
  })
  if (error) {
    console.error('[admin/contenu] unhideContentItem error:', error.message, error.code, error.details)
    return { success: false, error: translateModerationError(error.message) }
  }
  revalidatePath('/admin/contenu')
  return { success: true }
}
