import type { AnnonceDisplayStatus } from '@/lib/marche/annonce-status'

// Who may edit an annonce's content, in ONE place — the F4 « Modifier l'annonce » button, the list kebab, the edit page and updateAnnonce all ask
// this. The DB is the real lock: enforce_job_post_writes (migration 20261027203831) refuses any content change, and job_post_skills any
// insert / delete, once the post has a proposal (42501, hint `content_locked`); a freelancer answered on the strength of the text they read.
// The other two blocks are product rules the DB does not state: a closed / expired post has nothing left to improve, and a moderated one is
// not edited around its moderation.
export type AnnonceEditBlock = 'not_open' | 'moderated' | 'has_responses'

export function annonceEditBlock(a: {
  displayStatus: AnnonceDisplayStatus
  responseCount: number
  adminHiddenAt: string | null
}): AnnonceEditBlock | null {
  if (a.displayStatus !== 'open') return 'not_open'
  if (a.adminHiddenAt) return 'moderated'
  if (a.responseCount > 0) return 'has_responses'
  return null
}

/** i18n key of the refusal shown for each block (the edit page, and updateAnnonce's result). */
export const ANNONCE_EDIT_BLOCK_KEY: Record<AnnonceEditBlock, string> = {
  not_open: 'annonce.error.edit_unavailable',
  moderated: 'annonce.error.edit_unavailable',
  has_responses: 'annonce.error.content_locked',
}
