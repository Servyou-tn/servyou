# D2 mobile 375 (`feat/m375-d2-service`, 2026-11-01)

## `ListingResults` hydration mismatch on `opacity` / `filter` / `transform`

**What** In dev, every page that renders `ListingResults` logs « A tree hydrated but some attributes of the server rendered HTML didn't match » for the BlurFade
wrapper: the client computes `useReducedMotion()` (offset 0, blur 0, opacity 1) where the server rendered the animated start state (translateY(-6px), blur 6, opacity 0).
Seen on D2's related strip; the grid variant shares the same line, so it is older than the rail.

**Why deferred** Out of scope for a layout PR; no visible effect (the animation settles to the same state).

**Where it lives** `src/components/listings/ListingResults.tsx` (`fade`), `src/components/magicui/blur-fade.tsx`.

**Trigger** Any pass on motion / reduced-motion, or when the dev « 1 Issue » badge needs to be clean for a gate.

## D2 desktop « Voir profil » goes to `/marche/services`

**What** The desktop buy box's « Voir profil » button links to the services marketplace, not the freelancer's profile (`/freelance/{freelancerProfileId}`). The 375 row added in
this PR links to the profile correctly.

**Why deferred** Pre-existing; the desktop block was left as built (once built, stays built) and the fix is a one-line href the founder may want together with Q5 of
`docs/design/m375-d2-service-deltas.md`.

**Where it lives** `src/components/marche/ServiceDetail.tsx` (desktop `freelancerBlock`).

**Trigger** The next desktop pass on D2.
