# Password reset: cross-device link + expired-link message (`fix/reset-link-expired`, 2026-11-02)

## A dead auth cookie hides the « Lien expiré » message on the home page

- **What:** a visitor who opens an expired reset link while their browser still holds an auth cookie for a session
  that cannot be refreshed is sent to `/session-expiree` by the middleware (K2) before the home page can forward
  `?error_code=otp_expired` to `/nouveau-mot-de-passe`. They see « session expirée », not « Lien expiré ».
- **Why deferred:** rare (old-format emails only, and only with a dead cookie), and the fix touches the platform
  session layer, which is out of scope for this PR.
- **Where it lives:** `src/middleware.ts` (`sessionExpired`), `src/app/page.tsx` (`expiredLinkRedirect`).
- **Trigger:** a report of it, or the next middleware change. Fix: let `/?error_code=otp_expired` skip the K2 bounce,
  or do the forward in the middleware.

## Reset links from localhost / previews point at production

- **What:** the new « Reset Password » template uses `{{ .SiteURL }}`, so a reset requested from localhost or a Vercel
  preview links to production `/nouveau-mot-de-passe`. Same database, so it works, but local testing of the confirm
  step means copying the `token_hash` into a localhost URL.
- **Why deferred:** `{{ .RedirectTo }}` would keep the origin but depends on the Redirect URLs allow list, the
  likely cause of reset links landing on `/` in the first place.
- **Where it lives:** Supabase dashboard → Authentication → Email Templates → Reset Password.
- **Trigger:** if previews need their own reset flow. Fix: allow-list each origin's `/nouveau-mot-de-passe` and switch
  the template to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`.

## The PKCE `?code=` reset path can go once old emails have expired

- **What:** `NewPasswordForm` still opens the form on the `PASSWORD_RECOVERY` event from a `?code=` exchange, and
  `ForgotPasswordForm` still passes `redirectTo`, so reset emails sent before the template change keep working.
- **Why deferred:** emails already in inboxes need it until they expire (1 h by default).
- **Where it lives:** `src/components/auth/NewPasswordForm.tsx`, `src/components/auth/ForgotPasswordForm.tsx`.
- **Trigger:** any time after the template switch has been live for a day. Optional cleanup, not required.
