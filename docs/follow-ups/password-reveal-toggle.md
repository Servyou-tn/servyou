# Password show / hide eye — follow-ups (`feat/password-reveal-toggle`, 2026-11-13)

## 1. On a small phone, the cookie banner covers the sign-in and sign-up forms on a first visit

**What:** at 375 × 667 with no cookie choice yet, the banner card (pinned to the bottom, 3 buttons on 2 rows) starts at
265 px (FR) / 337 px (AR). The password field and its eye sit under it on /connexion (top 347 px) and /inscription/consumer
(top 475 px), and the page does not scroll them clear: a tap there lands on the banner text. Once the visitor answers the
banner, every eye is the element under the finger (measured: elementFromPoint at the eye's centre, 12 page × lang ×
width combinations). Not caused by this PR: the email field and the submit button are covered the same way.
**Why deferred:** one PR, one focus — the banner's layout is its own design (A7, CookieBanner.tsx).
**Where it lives:** `src/components/consent/CookieBanner.tsx` (the body padding it adds does not make the auth pages
scroll), the auth funnel layout (`src/components/auth/AuthShell.tsx` / `AuthFunnelLayout.tsx`).
**Trigger:** before launch traffic on phones. Options to weigh with Moatez: a shorter banner below `sm` (buttons on one
row, shorter copy), or let the auth layout scroll by the banner's height.

## 2. Two checks only a real device / browser can do

**What:** (a) Microsoft Edge shows no second eye (the `::-ms-reveal` rule is in the compiled CSS — 4 occurrences — but
Chrome, used for the gate, never draws that icon); (b) the reset form on /nouveau-mot-de-passe, which opens only from a
real recovery email — it is the same PasswordField as sign-in and sign-up, covered by the unit tests and the gate there.
**Why deferred:** no Edge in the gate harness; a recovery link needs a production account and email.
**Where it lives:** `src/components/ui/password-reveal.tsx`, `src/components/auth/PasswordField.tsx`.
**Trigger:** Moatez's morning review (one sign-in in Edge, one password reset by email).
