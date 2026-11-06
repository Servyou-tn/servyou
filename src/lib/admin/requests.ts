import { z } from 'zod'

// Input + error contract of the admin « Demandes » actions (src/app/admin/demandes/actions.ts). A plain module, not
// 'use server' (a 'use server' file may export only async functions), so the page can import the codes too.
//
// The actions return i18n KEYS; the admin page maps them to text in fr.ts / ar.ts (Agent B). The RPCs
// (migrations 20261106074610 + 20261106083409) raise French messages with SQLSTATE 42501 / 23514 / P0002; they are
// matched WHOLE here, never as substrings, except the open-order one, which carries a count.

/** Longest admin note: the RPCs' own bound (char_length > 500 → 23514). */
export const REQUEST_NOTE_MAX = 500

export const REQUEST_ERROR = {
  forbidden: 'admin.requests.error_forbidden',
  notFound: 'admin.requests.error_not_found',
  alreadyProcessed: 'admin.requests.error_already_processed',
  alreadyHandled: 'admin.requests.error_already_handled',
  noteRequired: 'admin.requests.error_note_required',
  noteTooLong: 'admin.requests.error_note_too_long',
  openOrders: 'admin.requests.error_open_orders',
  selfAccount: 'admin.requests.error_self_account',
  adminAccount: 'admin.requests.error_admin_account',
  /** The deletion is approved in the database, but the login / files step did not finish: retry the same action. */
  erasureIncomplete: 'admin.requests.error_erasure_incomplete',
  generic: 'common.error_generic',
} as const

export type RequestErrorKey = (typeof REQUEST_ERROR)[keyof typeof REQUEST_ERROR]

export type RequestActionResult =
  | { success: true }
  /** `approved: true` only with erasureIncomplete: the request IS approved; the page offers « Terminer la suppression ». */
  | { success: false; error: RequestErrorKey; approved?: true }

/** The audit action written once an approved deletion's auth + files step has fully succeeded. An approved request
 * with no such row for its user (target_id) is « côté connexion non terminé ». */
export const ERASURE_AUDIT_ACTION = 'complete_account_erasure'

export const ALREADY_PROCESSED_MESSAGE = 'Cette demande a déjà été traitée.'

const MESSAGES: Record<string, RequestErrorKey> = {
  'Accès réservé aux administrateurs.': REQUEST_ERROR.forbidden,
  'Demande introuvable.': REQUEST_ERROR.notFound,
  'Message introuvable.': REQUEST_ERROR.notFound,
  'Compte introuvable.': REQUEST_ERROR.notFound,
  [ALREADY_PROCESSED_MESSAGE]: REQUEST_ERROR.alreadyProcessed,
  'Ce message est déjà traité.': REQUEST_ERROR.alreadyHandled,
  'Indiquez le motif du refus.': REQUEST_ERROR.noteRequired,
  'La note est trop longue (500 caractères maximum).': REQUEST_ERROR.noteTooLong,
  'Vous ne pouvez pas traiter la suppression de votre propre compte.': REQUEST_ERROR.selfAccount,
  'Un compte administrateur ne peut pas être supprimé ici.': REQUEST_ERROR.adminAccount,
}

export function requestRpcErrorKey(error: { code?: string; message: string }): RequestErrorKey {
  const known = MESSAGES[error.message]
  if (known) return known
  if (error.code === '23514' && error.message.startsWith('Ce compte a encore ')) return REQUEST_ERROR.openOrders
  if (error.code === '42501') return REQUEST_ERROR.forbidden
  if (error.code === 'P0002') return REQUEST_ERROR.notFound
  return REQUEST_ERROR.generic
}

const Note = z
  .string()
  .trim()
  .max(REQUEST_NOTE_MAX)
  .optional()
  .transform((v) => (v ? v : undefined))

export const RequestInput = z.object({ id: z.string().uuid(), note: Note })
/** A refusal needs a note (the RPCs refuse it too). */
export const RefusalInput = z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(REQUEST_NOTE_MAX) })

/** The approve RPC's jsonb result. */
export const ApprovedResult = z.object({ status: z.literal('approved'), user_id: z.string().uuid(), tombstone_email: z.string() })

/** Maps a failed input parse to the key the page shows: an over-long note, a missing refusal note, or generic. */
export function inputErrorKey(error: z.ZodError): RequestErrorKey {
  const noteIssue = error.issues.find((issue) => issue.path[0] === 'note')
  if (!noteIssue) return REQUEST_ERROR.generic
  return noteIssue.code === 'too_big' ? REQUEST_ERROR.noteTooLong : REQUEST_ERROR.noteRequired
}
