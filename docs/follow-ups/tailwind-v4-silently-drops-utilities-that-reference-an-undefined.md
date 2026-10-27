# Tailwind v4 silently drops utilities that reference an undefined token — passed tsc/lint/build while visibly broken (found 2026-09-04, `feat/h4-dashboard-freelancer`)

- **What:** the H4 Ecosystem widget's consumers chip used `bg-success-600`. `tokens.css` only
  defines `success-50/100/500/700` — no `-600` — so Tailwind v4 generated no CSS for that class at
  all (no build warning, no lint error). The chip rendered as No background whatsoever; only the
  white icon glyph was visible, reading as an unfilled outline rather than the solid `#16A34A`
  circle in spec. `npx tsc --noEmit`, `npm run lint`, and `npm run build` were all clean the entire
  time this was broken.
- **Fixed here:** swapped to `bg-success-500`, which resolves to `#16A34A` — the exact measured
  spec color already on record in `docs/design/h4-discovery.md` §9 — and is screenshot-verified
  solid.
- **Not fixed here — the general gap:** nothing in the standing DoD checklist (tsc/lint/test/build)
  catches a Tailwind utility that silently no-ops because its token doesn't exist. This is the same
  failure class as [[reference_tailwind_v4_theme_utility_gotcha]] (a missing `--color-*` alias
  renders nothing, build stays green) but from the opposite direction — here the primitive existed
  at one shade and the utility referenced an adjacent shade that didn't.
- **Trigger:** worth a lint rule or a cheap token-name assertion (e.g. a script that greps every
  `bg-`/`text-`/`border-{brand,success,warning,danger}-{shade}` utility used in `src/` against the
  shades actually defined in `tokens.css`, run in CI) if one is cheap to add. Until then, add "does
  every color utility in the diff resolve to a defined token" to the manual visual-gate checklist.
