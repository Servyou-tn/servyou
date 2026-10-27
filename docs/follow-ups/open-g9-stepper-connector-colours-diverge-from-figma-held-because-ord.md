# G9 stepper connector colours diverge from Figma, held because `OrderRail` has two consumers

- **What:** Figma `495:26289` paints the **traversed** connector `#1f5fe0` (blue/600) and the
  untraversed one `#cbd5e1` (border/strong). The shipped rail paints them `#cbd5e1` (`border-strong`)
  and `#e2e8f0` (`border-subtle`) — i.e. Figma marks progress in brand blue, the code marks it in a
  darker grey. Rows **S8/S9** of `docs/design/g9-deltas-2.md`.
- **Why deferred:** `OrderRail` is shared. Its current colours are **E3's measured treatment**, and
  repainting them changes the buyer's rail on `/mes-commandes` against a frame (`709:59662`) that this
  pass did not measure. That makes it a two-consumer decision, not a delta fix.
- **Measured on both consumers** (2026-07-30, authenticated, after the `w-14 → lg:w-20` fix), so the
  next pass does not have to re-measure to scope it:
  | | G9 (7-step product) | E3 (4-stage service) |
  |---|---|---|
  | 1440: nodes / container / slack | 7 × 80 = 560 in 1071 → **−511** | 4 × 80 = 320 in 1081 → **−761** |
  | 375: nodes / container / slack | 7 × 56 = 392 in 278 → **+114 (overflows)** | 4 × 56 = 224 in 296 → **−72 (fits)** |
  | labels | 12/16, 0 of 7 wrap at 1440 | 12/16, 0 of 4 wrap at 1440 |
- **Trigger:** measure `709:59662`'s rail, then repaint both together — or accept the divergence
  deliberately and record it in the E3 delta file.
