import { z } from 'zod'

// Input shape for the admin moderation actions (src/app/admin/litiges/actions.ts, src/app/admin/signalements/actions.ts).
// Audit pass 2 « Logged »: their ids, notes and target types arrived unvalidated. They are admin-gated (checkAdmin +
// RLS), so this is hygiene, not an exploit fix: a malformed id never reaches a query or an RPC cast (22P02), a
// revalidatePath never receives a caller-built string, and a note stays bounded. A plain module (not 'use server'),
// so these helpers are not themselves callable endpoints.

/** Longest admin note / hide reason / suspension reason — the same bound as the longest user text (a dispute). */
export const ADMIN_TEXT_MAX = 2000

const Uuid = z.string().uuid()

export function isUuid(value: unknown): value is string {
  return Uuid.safeParse(value).success
}

export const MODERATION_TARGET_TYPES = ['product', 'service', 'shop', 'freelancer_profile', 'job_post'] as const

export function isModerationTargetType(value: unknown): value is (typeof MODERATION_TARGET_TYPES)[number] {
  return typeof value === 'string' && (MODERATION_TARGET_TYPES as readonly string[]).includes(value)
}
