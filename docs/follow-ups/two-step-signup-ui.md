# Two-step sign-up, UI-1: follow-ups (`feat/two-step-signup-ui`, 2026-11-16)

UI-1 of DB-1 → UI-1 → DB-2 (plan: `docs/follow-ups/two-step-signup-plan.md`; DB-1: `docs/follow-ups/two-step-signup-db.md`).

## 1. MEDIUM: a person can still be signed into someone else's COMPLETE account by a link they were sent

- **What:** anyone can e-mail themselves a ServYou link and forward it. Opened by someone else, « Continuer » signs that
  person into the sender's account (login CSRF by a forwarded link). The « Continuer » POST refuses another site's form,
  and step 2 shows « Connecté en tant que {email} », but a COMPLETE account goes straight to `next` with no such line.
- **Why deferred:** the forwarded-link case needs the victim's own click on a mail the attacker sent from their inbox;
  every e-mail sign-in link on the web shares it. A clear « you are signed in as » on the account menu is the usual answer.
- **Where it lives:** `src/app/auth/confirm/route.ts` (complete accounts), the topbar account menu.
- **Trigger:** the account-menu pass, or the first support report of « I am in the wrong account ».

## 2. LOW: /verifier-email's resend drops the funnel's next

- **What:** a person with an OLD link (sent before UI-1) that failed resends from `/verifier-email`; the new link carries
  `next=/`, not the product page they came from (that page kept it in sessionStorage).
- **Why deferred:** the page only lives until the last pre-UI-1 links have expired (one day at most), then goes (plan §9).
- **Where it lives:** `src/components/auth/VerifyEmailFlow.tsx`.
- **Trigger:** removing `/verifier-email`'s `?code=` path.

## 3. LOW: the server client ignores @supabase/ssr's no-store headers

- **What:** `src/lib/supabase/server.ts`'s `setAll` drops the cache headers @supabase/ssr passes with a new session. On
  `/auth/confirm` the response is a 303 (never cached), so nothing leaks today.
- **Why deferred:** shared by every Server Component and action; changing it is its own PR.
- **Where it lives:** `src/lib/supabase/server.ts`.
- **Trigger:** the first cacheable response that sets a session.

## 4. INFO: `next dev` printed a security notice for Next.js 16.4.3

- **What:** on 2026-11-16 `npx next dev` stopped once with « Your version of Next.js is affected by a known security
  vulnerability », pointing at npm's advisory endpoint; a retry ran normally. `npm audit` did not answer within 90 s from
  the dev PC, so the advisory is not confirmed here.
- **Why deferred:** a dependency upgrade is its own PR (one PR, one focus), with its own full build and VRT run.
- **Where it lives:** `package.json` (`next`).
- **Trigger:** now — the founder or the architect decides on a security upgrade PR.
