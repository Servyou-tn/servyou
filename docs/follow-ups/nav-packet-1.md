# Follow-ups — navigation packet 1 (`fix/nav-packet-1`, 2026-11-03)

## The real sign-in / sign-up return is not walked on localhost

**What** Supabase Auth verifies the CAPTCHA token with the real secret, so the sign-in and sign-up forms cannot submit locally (walk
2026-11-02, « Environment limits »). This PR keeps `?next=` from « Demander ce produit » through `/connexion` → `/inscription` → the role
form → email verification (unit-tested: `src/lib/auth/next-param.test.ts`, the existing `resolveSignInDestination` tests), but the live
hop « submit → back on the product's request form » was not clicked through.

**Why deferred** Environment limit, not a code gap.

**Where it lives** `src/app/connexion/components/SigninForm.tsx` (`resolveSignInDestination`), `src/components/auth/VerifyEmailFlow.tsx`.

**Trigger** The next check on the Vercel preview or production with a real account (sign in from « Demander ce produit », then sign up
from it with a fresh email).

## Landing `Hero` hydration mismatch (pre-existing)

**What** In dev, the logged-out home logs « A tree hydrated but some attributes … didn't match » for `Hero`: the server renders the
`<canvas>` branch, the client the content block. `Hero` branches on `useReducedMotion()` / `matchMedia`, which have no server value.

**Why deferred** Pre-existing (this PR only changed one `href` in `Hero`); a separate client-only-branch fix.

**Where it lives** `src/components/landing/Hero.tsx`.

**Trigger** The next landing change, or a hydration-warning sweep.

## The seller dashboard and the order pages still name the LAST step differently

**What** Like « Confirmer » / « Accepter » (#14, fixed here), the final seller step is « Marquer livrée » on the dashboard
(`seller.dashboard.advance.arrived`) and « Marquer arrivée » on `/commandes-recues` (`seller.orders.advance.arrived`); AR « تأكيد التسليم »
on both.

**Why deferred** Not in the founder's packet; one word to choose.

**Where it lives** `src/lib/i18n/fr.ts` (`seller.dashboard.advance.arrived`, `seller.orders.advance.arrived`).

**Trigger** A founder ruling on the word.

## E1-product's action stack still uses `flex-col-reverse`

**What** #300 made E1-service's buttons render once per width so the tab order is the visual order; E1-product's form still reverses its
stack with CSS.

**Why deferred** No 375 frame for E1-product; noted in #300's review.

**Where it lives** `src/app/demander/[id]/_components/ProductRequestForm.tsx`.

**Trigger** The E1-product mobile pass.
