'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { readNext } from '@/lib/auth/next-param'
import {
  completeAccountFieldErrors,
  outcomeForPasswordError,
  outcomeForRpcHint,
  type CompleteAccountOutcome,
  type FieldErrors,
} from '@/lib/auth/complete-account'

// Step 2 of the two-step sign-up (« Finalisez votre compte »). The call ORDER is the contract with complete_my_account
// (migration 20261115222457; docs/follow-ups/two-step-signup-db.md, item 2):
//   1. signOut({ scope: 'others' }): the RPC refuses while another session of the account is alive (a squatter's
//      password session could otherwise have set the password);
//   2. updateUser({ password }): the RPC needs a password set during THIS session (a password chosen at creation never
//      counts);
//   3. complete_my_account(name, birth date, city, terms version).
// On `other_sessions` (a session opened between 1 and 3) it ends them again and retries the RPC once, WITHOUT a second
// updateUser: the password is already set in this session, and GoTrue would refuse the same one (same_password).
//
// `same_password` itself is not a stop: a resubmit after an RPC failure (a timeout, terms_outdated, a double submit) meets
// it because THIS session already set that password. The RPC decides: if the password was set in this session it
// completes; if not (password_required: someone retyping an older password) the field asks for a different one.

const Input = z.object({
  fullName: z.string().max(200),
  password: z.string().max(200),
  dateOfBirth: z.string().max(20),
  city: z.string().max(100),
  termsAccepted: z.boolean(),
  termsVersion: z.string().min(1).max(100),
  next: z.string().max(2048).nullable(),
})

export type CompleteAccountResult =
  | { ok: true; destination: string }
  | { ok: false; fieldErrors: FieldErrors }
  | { ok: false; outcome: Exclude<CompleteAccountOutcome, { kind: 'done' } | { kind: 'retry' }> }

export async function completeAccount(raw: unknown): Promise<CompleteAccountResult> {
  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { ok: false, outcome: { kind: 'error', key: 'signup.form.errors.generic' } }
  const input = parsed.data

  const fieldErrors = completeAccountFieldErrors(input)
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, outcome: { kind: 'new_link' } }

  async function attempt(setPassword: boolean): Promise<CompleteAccountOutcome> {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
    // Not fatal: the RPC checks the sessions itself (other_sessions) and this action retries once.
    if (signOutError) {
      console.error('[completeAccount] signOut(others) error:', signOutError.message, signOutError.code, signOutError.status)
    }

    let passwordUnchanged = false
    if (setPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({ password: input.password })
      if (passwordError?.code === 'same_password') passwordUnchanged = true
      else if (passwordError) {
        console.error('[completeAccount] updateUser error:', passwordError.message, passwordError.code, passwordError.status)
        return outcomeForPasswordError(passwordError.code)
      }
    }

    const { error } = await supabase.rpc('complete_my_account', {
      p_full_name: input.fullName.trim(),
      p_date_of_birth: input.dateOfBirth,
      p_city: input.city,
      p_terms_version: input.termsVersion,
    })
    if (!error) return { kind: 'done' }
    console.error('[completeAccount] complete_my_account error:', error.message, error.code, error.details, error.hint)
    if (passwordUnchanged && error.hint === 'password_required') return outcomeForPasswordError('same_password')
    return outcomeForRpcHint(error.hint)
  }

  let outcome = await attempt(true)
  if (outcome.kind === 'retry') outcome = await attempt(false)
  // Still another session after the retry: something keeps opening them. This session cannot finish; a new link can.
  if (outcome.kind === 'retry') outcome = { kind: 'new_link' }

  if (outcome.kind === 'done') return { ok: true, destination: readNext(input.next ?? undefined) ?? '/' }
  return { ok: false, outcome }
}
