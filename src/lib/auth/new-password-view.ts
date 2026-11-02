import type { NewPasswordInitialView } from '@/components/auth/NewPasswordForm'
import { isExpiredLinkError } from '@/lib/auth/expired-link'
import { recoveryTokenHash } from '@/lib/auth/recovery-link'

type SearchParams = Record<string, string | string[] | undefined>

// /nouveau-mot-de-passe's first state, decided server-side from the URL. An error wins over a token_hash (GoTrue sent
// the error; the hash, if any, is stale): otp_expired → expired, any other ?error → invalid, then a token_hash
// recovery link → confirm, else checking (the PKCE ?code= link or a reload, settled by the client listener).
export function newPasswordInitialView(searchParams: SearchParams): {
  initialView: NewPasswordInitialView
  tokenHash: string | undefined
} {
  const tokenHash = recoveryTokenHash(searchParams) ?? undefined
  if (isExpiredLinkError(searchParams)) return { initialView: 'expired', tokenHash: undefined }
  if (searchParams.error) return { initialView: 'invalid', tokenHash: undefined }
  return { initialView: tokenHash ? 'confirm' : 'checking', tokenHash }
}
