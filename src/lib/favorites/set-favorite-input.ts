import 'server-only'
import { z } from 'zod'

// The input of setFavoriteAction (shop / freelancer favorites, migration 98 — see ./targets.ts). SERVER-ONLY: this schema used
// to live in targets.ts next to the small helpers that TopbarUserMenu and the hearts import, which put all of zod in every
// page's JavaScript (speed PR-1, audit M8). `server-only` turns a client import of this file into a build error.
export const SetFavoriteInput = z.object({
  kind: z.enum(['shop', 'freelancer']),
  targetId: z.string().uuid(),
  /** The state the caller wants — idempotent, so a double click or a retry cannot flip it back. */
  favorited: z.boolean(),
})

export type SetFavoriteInput = z.infer<typeof SetFavoriteInput>
