# Follow-ups — F4 + home at 375 (`feat/m375-f4-home-ar`, 2026-11-04)

## F4's back link renders at 16 on desktop (should be 14)

**What** « Retour à mes annonces » builds its classes with `cn()`, which merges `text-body-sm` with `text-brand-blue-600` and drops the
size (tailwind-merge files custom size tokens in the colour group). The link renders 16 / 24 at every width. PR-A3 sets 14 / 17 below lg
only, through a `max-lg:` variant nothing competes with.

**Why deferred** The fix changes desktop pixels; mobile PRs keep desktop at 0 px. Asked as Q3 in `docs/design/m375-f4-home-ar-deltas.md`.

**Where it lives** `src/components/marche/AnnonceDetail.tsx`, the back `<Link>`. Move the text classes to a plain string (the repo's
pattern) and drop the `max-lg:` duplicate.

**Trigger** The founder's answer to Q3.

## Arabic: French user text reorders on F4

**What** In AR, user-typed French (the post's description, each proposal's message, the freelancer's typed timeframe) is laid out RTL: a
final period jumps to the start (« .disponibilité »), « 3 semaines » reads « semaines 3 ». Every width.

**Why deferred** Changes desktop AR pixels. Asked as Q4.

**Where it lives** `src/components/marche/AnnonceDetail.tsx` (description `<p>`), `src/components/marche/AnnonceResponseCard.tsx` (message
`<p>`, timeframe `<dd>`) — `dir="auto"` on each user-text element, the AnnonceRow title's pattern.

**Trigger** The founder's answer to Q4.
