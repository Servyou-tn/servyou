// The COD no-show admin RPCs (admin_lift_cod_block, admin_void_refusal; db/migrations/20261115182353_cod_no_show.sql) raise
// on every failure with a stable code + hint, and log to the admin journal in the same transaction (the
// admin_suspend_user pattern). This maps a refusal to the i18n key the admin action answers with. A plain module
// (not 'use server'), so it is not itself a callable endpoint.

type DbError = { code?: string | null; hint?: string | null }

/** Same bound as the RPCs' note check (500 characters). */
export const COD_NOTE_MAX = 500

const HINT_KEYS: Record<string, string> = {
  note_required: 'admin.cod.error_note_required',
  note_too_long: 'admin.cod.error_note_too_long',
  cod_not_blocked: 'admin.cod.error_not_blocked',
  not_a_refusal: 'admin.cod.error_not_a_refusal',
  refusal_already_voided: 'admin.cod.error_already_voided',
}

export function codAdminErrorKey(error: DbError): string {
  if (error.code === '42501') return 'admin.users.error_forbidden'
  if (error.code === '23514' && error.hint && Object.hasOwn(HINT_KEYS, error.hint)) return HINT_KEYS[error.hint]
  return 'common.error_generic'
}

/** The note an admin types, trimmed, or the key of why it is refused (checked again by the RPC). */
export function checkCodNote(note: unknown): { ok: true; note: string } | { ok: false; error: string } {
  const trimmed = typeof note === 'string' ? note.trim() : ''
  if (trimmed.length === 0) return { ok: false, error: 'admin.cod.error_note_required' }
  if (trimmed.length > COD_NOTE_MAX) return { ok: false, error: 'admin.cod.error_note_too_long' }
  return { ok: true, note: trimmed }
}
