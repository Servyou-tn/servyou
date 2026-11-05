# Follow-ups — I2 + Aide at 375 (`feat/m375-i2-aide`, 2026-11-05)

## Aide search caption renders at 16 on desktop (should be 12)

**What** The caption under the Aide search (« La recherche filtre les questions… ») built its classes with `cn()`, which drops `text-caption`
(and, while searching, `text-body-sm`) beside a text colour: it rendered 16 / 24 at every width. PR-A9 makes it a plain class string with
the sizes below lg; from lg the classes are exactly what `cn()` produced, so desktop still renders 16.

**Why deferred** It changes desktop pixels; asked as Q2 in `docs/design/m375-i2-aide-deltas.md`. Same class of bug as F4's back link and
G5's « Modifier ».

**Where it lives** `src/components/aide/AideCenter.tsx` (the caption `<p>` under the search) — add `text-caption leading-[17px]` /
`text-body-sm` to the base of its plain class string.

**Trigger** The design pass (with F4's back link and G5's « Modifier ») — founder, 2026-11-05.

## I2 page inset at 375

✅ CLOSED — founder, 2026-11-05: keep the full 343 column, consistent with every other mobile page.
