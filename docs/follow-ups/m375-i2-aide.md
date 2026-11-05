# Follow-ups — I2 + Aide at 375 (`feat/m375-i2-aide`, 2026-11-05)

## Aide search caption renders at 16 on desktop (should be 12)

**What** The caption under the Aide search (« La recherche filtre les questions… ») built its classes with `cn()`, which drops `text-caption`
(and, while searching, `text-body-sm`) beside a text colour: it rendered 16 / 24 at every width. PR-A9 makes it a plain class string with
the sizes below lg; from lg the classes are exactly what `cn()` produced, so desktop still renders 16.

**Why deferred** It changes desktop pixels; asked as Q2 in `docs/design/m375-i2-aide-deltas.md`. Same class of bug as F4's back link and
G5's « Modifier ».

**Where it lives** `src/components/aide/AideCenter.tsx` (the caption `<p>` under the search) — add `text-caption leading-[17px]` /
`text-body-sm` to the base of its plain class string.

**Trigger** The founder's answer to Q2 (or the design pass).

## I2 page inset at 375

**What** The Paramètres 375 frame nests the page in a second 16 px padding (content 311 at x 32, footer content at x 32). We keep the full
343 column used by every other mobile page.

**Why deferred** A layout choice that differs from every other page; asked as Q1.

**Where it lives** `src/app/parametres/page.tsx`, `src/components/parametres/ParametresShell.tsx` (footer).

**Trigger** The founder's answer to Q1.
